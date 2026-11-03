# DeepSeek 峰谷时钟（dsh-deepseek-peak-clock）

给 [DeepSeek Harness](https://github.com/deepseek-ai) 的 Web 界面加一行常驻提示，用来区分 DeepSeek 的峰时/谷时价格：

```
[● 谷时]  距峰时 02:41:53   ▁▁▁▂▂▂▂▂▂▂▂▁▁   09:18:07
```

- 左侧胶囊：当前处于 **峰时**（琥珀）还是 **谷时**（绿）。
- 中间：距下一次切换的倒计时；进入最后 10 分钟自动高亮，提醒“现在发大任务要么等一等、要么按峰价算”。
- 细条：今日 24 小时里的峰时段位置，加一个“现在”的游标（周末整条无峰段）。
- 右侧：北京时间 `HH:MM:SS`（固定 `Asia/Shanghai`，不受本机时区影响）。
- 悬停出完整规则说明。

## 时段规则

| 时段 | 时间（北京时间） | 价格 |
| --- | --- | --- |
| 峰时 | 周一至周五 09:00–12:00、14:00–18:00 | 约为谷时的 2 倍 |
| 谷时 | 其余全部时段，含夜间、凌晨、周末 | 约为峰时的一半 |

口径来自 2026 年这轮调价：工作日 9–12、14–18 点为高峰，其余时间与周末统一低峰价（[阿里云开发者社区整理](https://developer.aliyun.com/article/1762316)）。价格表若再变，改下面四个常量即可，不用动渲染代码。

## 安装

三种方式，任选其一。

**1. 从 GitHub 直接装（推荐，换机只需一行）**

```bash
dsh plugin --profile desktop add github:Ricky74192/dsh-deepseek-peak-clock
```

装完重启该 profile：`dsh desktop`。

**2. 本地目录安装**

把仓库克隆到任意位置，然后在 Harness 里用 `plugin_manager`：

```
action: install_bundle
target: <仓库绝对路径>
```

等价命令行：`dsh plugin --profile desktop add <仓库绝对路径>`。

**3. 手动放文件**

把整个目录拷到 `$DSH_HOME/profiles/<profile>/local-plugins/`，把 `package.json` 的依赖指向它，再 `dsh plugin --profile <profile> install`。

## 调整

改 `client.js` 顶部四个常量后重装（从 GitHub 装的话 push 新 commit 再 `dsh plugin add` 一次即可）：

```js
const PEAK_DAYS = [0, 1, 2, 3, 4];                            // 周一 = 0
const PEAK_RANGES = [[9 * 60, 12 * 60], [14 * 60, 18 * 60]];  // 分钟数
const ZONE = 'Asia/Shanghai';                                 // 计价所用时区
const SOON_SECONDS = 10 * 60;                                 // 提前高亮阈值
```

想换位置：把 `client.js` 里的 `SLOT` 改成 `conversation.session.header.utilities`（会话标题栏右侧）或 `sidebar.footer.action`（侧栏底部，空间窄，建议只留胶囊+倒数）。

## 结构

| 文件 | 作用 |
| --- | --- |
| `index.js` | Host 半侧，空实现，仅让 Loader 条目可激活 |
| `client.js` | Client 半侧，向 `conversation.composer.dock` 注册 `deepseek-peak-clock` 条目并渲染 |
| `cordis.patch.yml` | 插入 Loader 行 `deepseek-peak-clock` |
| `locale/zh.json`、`locale/en.json` | Plugin Manager 展示用的标题与描述 |
| `icon.svg` | 插件图标（自绘：琥珀=峰、绿=谷的表盘） |

界面文案走 Client locale 服务（命名空间 `dsh-deepseek-peak-clock`），颜色只用 `--dsw-alias-*` 主题令牌，浅色/深色主题都跟随宿主。

## 边界

- 只读浏览器时钟，不联网、不读会话内容、不写任何存储。
- 时段按官方价目表写死，不做网络校验；官方改价后需要更新常量。
- 一个页面只注册一个条目；重复安装会替换同名 cell（`id` 固定为 `deepseek-peak-clock`）。

## License

MIT
