window.__ModuleLoader__.load({
  id: '@local/dsh-deepseek-peak-clock',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'dsh-deepseek-peak-clock';
    const SLOT = 'conversation.composer.dock';

    // ------------------------------------------------------------------ 词条
    const DICTS = {
      zh: {
        peak: '峰时',
        valley: '谷时',
        toValley: '距谷时',
        toPeak: '距峰时',
        tip: [
          'DeepSeek 峰谷计价（北京时间）',
          '峰时：周一至周五 09:00–12:00、14:00–18:00，单价约为谷时的 2 倍',
          '谷时：其余全部时段，含夜间、凌晨与周末，单价约为峰时的一半',
          '批量与后台任务挪到谷时执行，成本接近对半',
        ].join('\n'),
      },
      en: {
        peak: 'Peak',
        valley: 'Off-peak',
        toValley: 'off-peak in',
        toPeak: 'peak in',
        tip: [
          'DeepSeek peak/off-peak pricing (Asia/Shanghai)',
          'Peak: Mon–Fri 09:00–12:00 and 14:00–18:00, about 2× the off-peak unit price',
          'Off-peak: every other hour, including nights and weekends, at about half price',
          'Move batch and background jobs to off-peak hours to roughly halve the cost',
        ].join('\n'),
      },
    };

    // ------------------------------------------------------------------ 时段模型
    // 峰时 = 周一至周五 09:00–12:00、14:00–18:00（北京时间）
    // 谷时 = 其余全部时段（夜间、凌晨、周末），单价约为峰时的一半
    const ZONE = 'Asia/Shanghai';
    const DAY_MIN = 24 * 60;
    const WEEK_MIN = 7 * DAY_MIN;
    const PEAK_DAYS = [0, 1, 2, 3, 4]; // 周一 = 0
    const PEAK_RANGES = [[9 * 60, 12 * 60], [14 * 60, 18 * 60]];
    const WEEKDAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const SOON_SECONDS = 10 * 60;

    const CLOCK_FORMAT = new Intl.DateTimeFormat('en-GB', {
      timeZone: ZONE,
      hour12: false,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // 周内所有峰时段，前后各多铺一周，便于跨周、跨周末求下一次切换点。
    const SEGMENTS = (() => {
      const list = [];
      for (const weekOffset of [-WEEK_MIN, 0, WEEK_MIN]) {
        for (const day of PEAK_DAYS) {
          for (const range of PEAK_RANGES) {
            list.push([
              weekOffset + day * DAY_MIN + range[0],
              weekOffset + day * DAY_MIN + range[1],
            ]);
          }
        }
      }
      return list;
    })();

    function readZone(nowMs) {
      const parts = CLOCK_FORMAT.formatToParts(new Date(nowMs));
      const pick = (type) => {
        for (const part of parts) {
          if (part.type === type) return part.value;
        }
        return '';
      };
      const hour = Number(pick('hour')) % 24;
      const minute = Number(pick('minute'));
      const second = Number(pick('second'));
      const index = WEEKDAY_INDEX[pick('weekday')];
      return {
        hour: Number.isFinite(hour) ? hour : 0,
        minute: Number.isFinite(minute) ? minute : 0,
        second: Number.isFinite(second) ? second : 0,
        dayOfWeek: typeof index === 'number' ? index : 0,
      };
    }

    function computeState(nowMs) {
      const { hour, minute, second, dayOfWeek } = readZone(nowMs);
      const minuteOfDay = hour * 60 + minute + second / 60;
      const weekMinute = dayOfWeek * DAY_MIN + minuteOfDay;

      let peak = false;
      let remain = Number.POSITIVE_INFINITY;
      for (const segment of SEGMENTS) {
        const start = segment[0];
        const end = segment[1];
        if (weekMinute >= start && weekMinute < end) {
          peak = true;
          remain = Math.min(remain, end - weekMinute);
        } else if (start > weekMinute) {
          remain = Math.min(remain, start - weekMinute);
        }
      }

      return {
        hour,
        minute,
        second,
        dayOfWeek,
        minuteOfDay,
        peak,
        remainSeconds: Number.isFinite(remain) ? Math.max(0, Math.round(remain * 60)) : 0,
      };
    }

    // ------------------------------------------------------------------ 文本
    const pad2 = (value) => (value < 10 ? '0' + value : String(value));

    function formatClock(state) {
      return pad2(state.hour) + ':' + pad2(state.minute) + ':' + pad2(state.second);
    }

    function formatRemain(totalSeconds, chinese) {
      const seconds = Math.max(0, Math.floor(totalSeconds));
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const rest = seconds % 60;
      const body = pad2(hours) + ':' + pad2(minutes) + ':' + pad2(rest);
      if (days <= 0) return body;
      return (chinese ? days + '天 ' : days + 'd ') + body;
    }

    // ------------------------------------------------------------------ 视图
    const BAND_WIDTH = 84;
    const BAND_HEIGHT = 5;
    const BAND_PAD = 4;

    function Band({ dayOfWeek, minuteOfDay, accent }) {
      const todayRanges = dayOfWeek <= 4 ? PEAK_RANGES : [];
      const percent = (value) => (value / DAY_MIN) * 100;
      const children = [
        h('span', {
          key: 'track',
          style: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: BAND_PAD / 2,
            height: BAND_HEIGHT,
            borderRadius: BAND_HEIGHT / 2,
            background: 'var(--dsw-alias-bg-layer-2)',
            boxShadow: 'inset 0 0 0 1px var(--dsw-alias-border-l1)',
          },
        }),
      ];

      todayRanges.forEach((range, index) => {
        children.push(h('span', {
          key: 'peak-' + index,
          style: {
            position: 'absolute',
            top: BAND_PAD / 2,
            left: percent(range[0]) + '%',
            width: percent(range[1] - range[0]) + '%',
            height: BAND_HEIGHT,
            borderRadius: 2,
            background: 'var(--dsw-alias-state-warn-primary)',
            opacity: 0.9,
          },
        }));
      });

      children.push(h('span', {
        key: 'now',
        style: {
          position: 'absolute',
          top: 0,
          left: 'calc(' + percent(minuteOfDay) + '% - 1px)',
          width: 2,
          height: BAND_HEIGHT + BAND_PAD,
          borderRadius: 1,
          background: accent,
        },
      }));

      return h('span', {
        'aria-hidden': true,
        style: {
          position: 'relative',
          display: 'inline-block',
          flex: '0 0 auto',
          width: BAND_WIDTH,
          height: BAND_HEIGHT + BAND_PAD,
        },
      }, children);
    }

    function useTick() {
      const [now, setNow] = React.useState(() => Date.now());
      React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
      }, []);
      return now;
    }

    function createClock({ t, isChinese }) {
      return function DeepSeekPeakClock() {
        const now = useTick();
        const state = React.useMemo(() => computeState(now), [now]);
        const chinese = isChinese();

        const accent = state.peak
          ? 'var(--dsw-alias-state-warn-primary)'
          : 'var(--dsw-alias-state-success-primary)';
        const tint = state.peak
          ? 'color-mix(in srgb, var(--dsw-alias-state-warn-primary) 16%, transparent)'
          : 'color-mix(in srgb, var(--dsw-alias-state-success-primary) 16%, transparent)';

        const label = state.peak ? t('peak') : t('valley');
        const countdown = (state.peak ? t('toValley') : t('toPeak')) + ' '
          + formatRemain(state.remainSeconds, chinese);
        const clock = formatClock(state);
        const soon = state.remainSeconds > 0 && state.remainSeconds <= SOON_SECONDS;

        return h('div', {
          title: t('tip'),
          'aria-label': label + ' · ' + countdown + ' · ' + clock,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '2px 2px 0',
            fontSize: 11,
            lineHeight: '16px',
            color: 'var(--dsw-alias-label-secondary)',
            fontVariantNumeric: 'tabular-nums',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            cursor: 'default',
          },
        },
          h('span', {
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              height: 16,
              padding: '0 6px',
              borderRadius: 999,
              color: accent,
              background: tint,
              boxShadow: 'inset 0 0 0 1px color-mix(in srgb, currentColor 32%, transparent)',
              fontWeight: 600,
              letterSpacing: '0.02em',
              flex: '0 0 auto',
            },
          },
            h('span', {
              style: {
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: accent,
                flex: '0 0 auto',
              },
            }),
            label,
          ),
          h('span', {
            style: soon
              ? { color: accent, fontWeight: 600, flex: '0 0 auto' }
              : { flex: '0 0 auto' },
          }, countdown),
          h(Band, { dayOfWeek: state.dayOfWeek, minuteOfDay: state.minuteOfDay, accent }),
          h('span', { style: { flex: '0 0 auto' } }, clock),
        );
      };
    }

    // ------------------------------------------------------------------ 注册
    function apply(ctx) {
      const locale = typeof ctx.get === 'function' ? ctx.get('locale') : undefined;
      const disposers = [];

      if (locale && typeof locale.register === 'function') {
        for (const id of Object.keys(DICTS)) {
          try {
            disposers.push(locale.register(NS, id, DICTS[id]));
          } catch (error) {
            // 同名同语种已存在时沿用既有词条，不阻断挂载。
          }
        }
      }

      const t = locale && typeof locale.bind === 'function'
        ? locale.bind(NS)
        : (key) => (DICTS.zh[key] === undefined ? key : DICTS.zh[key]);

      const isChinese = () => {
        try {
          const snapshot = locale && typeof locale.getLocale === 'function' ? locale.getLocale() : null;
          const active = snapshot && typeof snapshot.active === 'string' ? snapshot.active : '';
          return active.toLowerCase().indexOf('zh') === 0;
        } catch (error) {
          return false;
        }
      };

      const Clock = createClock({ t, isChinese });

      const disposeSlot = ctx.slots.inject(SLOT, () => ctx.slots.register({
        name: SLOT,
        id: 'deepseek-peak-clock',
        order: 2,
      }, Clock));
      if (typeof disposeSlot === 'function') disposers.push(disposeSlot);

      return () => {
        for (const dispose of disposers) {
          try {
            if (typeof dispose === 'function') dispose();
          } catch (error) {
            // 卸载阶段忽略单个 disposer 失败。
          }
        }
      };
    }

    return { inject: ['slots'], apply };
  },
});
