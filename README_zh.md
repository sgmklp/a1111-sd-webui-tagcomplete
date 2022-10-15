# Booru tag autocompletion for A1111

[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/DominikDoom/a1111-sd-webui-tagcomplete)](https://github.com/DominikDoom/a1111-sd-webui-tagcomplete/releases)
## [English Document](./README.md)

## 功能概述

本脚本为 [AUTOMATIC1111 web UI](https://github.com/AUTOMATIC1111/stable-diffusion-webui)的自定义脚本,能在输入Tag时提供booru风格（如Danbooru）的TAG自动补全。因为有一些模型是基于这种TAG风格训练的（例如[Waifu Diffusion](https://github.com/harubaru/waifu-diffusion)），因此使用这些Tag能获得较为精确的效果。

这个脚本的创建是为了减少因复制Tag在Web UI和 booru网站的反复切换。
你可以按照[以下方法](#installation)下载或拷贝文件，也可以使用[Releases](https://github.com/DominikDoom/a1111-sd-webui-tagcomplete/releases)中打包好的文件。

## 新功能 - [Wildcard](https://github.com/jtkelm2/stable-diffusion-webui-1/blob/master/scripts/wildcards.py)  的支持
自动补全同样适用于 [Wildcard](https://github.com/jtkelm2/stable-diffusion-webui-1/blob/master/scripts/wildcards.py)中所述的通配符文件(后面有演示视频)。这将使你能够插入Wildcard脚本需要的通配符，更进一步的，你还可以插入通配符文件内的某个具体Tag。
#### 注意:
因为不是每个人都安装了Wildcard, 因此改功能**默认禁用**。编辑`tags/config.json`文件，将`"useWildcards"`的值改为`true`来启用它。之后在`tags/wildcardNames.txt`取消注释或添加 `/scripts/wildcards/`下的通配符文件的文件名, 如果你的通配符文件在其他路径下，这将不起作用。

### Known Issues:
If `replaceUnderscores` is active, the script will currently only partly replace edited tags containing multiple words in brackets.
For example, editing `atago (azur lane)`, it would be replaced with e.g. `taihou (azur lane), lane)`, since the script currently doesn't see the second part of the bracket as the same tag. So in those cases you should delete the old tag beforehand.

Also, at least for now there's no way to turn the script off from the ui, but I plan to get around to that eventually.

## Screenshots
Demo video (with keyboard navigation):

https://user-images.githubusercontent.com/34448969/195344430-2b5f9945-b98b-4943-9fbc-82cf633321b1.mp4

Wildcard script support:

https://user-images.githubusercontent.com/34448969/195632461-49d226ae-d393-453d-8f04-1e44b073234c.mp4

Dark and Light mode supported, including tag colors:

![tagtypes](https://user-images.githubusercontent.com/34448969/195177127-f63949f8-271d-4767-bccd-f1b5e818a7f8.png)
![tagtypes_light](https://user-images.githubusercontent.com/34448969/195180061-ceebcc25-9e4c-424f-b0c9-ba8e8f4f17f4.png)


## Installation
Simply put `tagAutocomplete.js` into the **`javascript`** folder of your web UI installation (**NOT** the `scripts` folder where most other scripts are installed). It will run automatically the next time the web UI is started.
For the script to work, you also need to download the `tags` folder from this repo and paste it and its contents into the web UI root, or create them there manually.

The folder structure should look similar to this at the end:

![image](https://user-images.githubusercontent.com/34448969/195697260-526a1ab8-4a63-4b8b-a9bf-ae0f3eef780f.png)

The tags folder contains `config.json` and the tag data the script uses for autocompletion. By default, Danbooru and e621 tags are included.

### Config
The config contains the following settings and defaults:
```json
{
	"tagFile": "danbooru.csv",
	"activeIn": {
		"txt2img": true,
		"img2img": true,
		"negativePrompts": true
	},
	"maxResults": 5,
	"replaceUnderscores": true,
	"escapeParentheses": true,
	"useWildcards": false,
	"colors": {
		"danbooru": {
			"0": ["lightblue", "dodgerblue"],
			"1": ["indianred", "firebrick"],
			"3": ["violet", "darkorchid"],
			"4": ["lightgreen", "darkgreen"],
			"5": ["orange", "darkorange"]
		},
		"e621": {
			"-1": ["red", "maroon"],
			"0": ["lightblue", "dodgerblue"],
			"1": ["gold", "goldenrod"],
			"3": ["violet", "darkorchid"],
			"4": ["lightgreen", "darkgreen"],
			"5": ["tomato", "darksalmon"],
			"6": ["red", "maroon"],
			"7": ["whitesmoke", "black"],
			"8": ["seagreen", "darkseagreen"]
		}
	}
}
```
| Setting	| Description |
|---------|-------------|
| tagFile | Specifies the tag file to use. You can provide a custom tag database of your liking, but since the script was developed with Danbooru tags in mind, it might not work properly with other configurations.|
| activeIn | Allows to selectively (de)activate the script for txt2img, img2img, and the negative prompts for both. |
| maxResults | How many results to show max. For the default tag set, the results are ordered by occurence count. |
| replaceUnderscores | If true, undescores are replaced with spaces on clicking a tag. Might work better for some models. |
| escapeParentheses | If true, escapes tags containing () so they don't contribute to the web UI's prompt weighting functionality. |
| useWildcards | Used to toggle the recently added wildcard completion functionality. Also needs `wildcardNames.txt` to contain proper file names for your wildcard files. |
| colors | Contains customizable colors for the tag types, you can add new ones here for custom tag files (same name as filename, without the .csv). The first value is for dark, the second for light mode. Color names and hex codes should both work.|

### CSV tag data
The script expects a CSV file with tags saved in the following way:
```csv
1girl,0
solo,0
highres,5
long_hair,0
```
Notably, it does not expect column names in the first row.
The first value needs to be the tag name, while the second value specifies the tag type.
The numbering system follows the [tag API docs](https://danbooru.donmai.us/wiki_pages/api%3Atags) of Danbooru:
| Value	| Description |
|-------|-------------|
|0	    | General     |
|1	    | Artist      |
|3	    | Copyright   |
|4	    | Character   |
|5	    | Meta        |

or of e621:
| Value	| Description |
|-------|-------------|
|-1	    | Invalid     |
|0	    | General     |
|1	    | Artist      |
|3	    | Copyright   |
|4	    | Character   |
|5	    | Species     |
|6	    | Invalid     |
|7	    | Meta        |
|8	    | Lore        |

The tag type is used for coloring entries in the result list.


## 项目地址和来源
插件原仓库 https://github.com/DominikDoom/a1111-sd-webui-tagcomplete

魔改后仓库 https://github.com/sgmklp/a1111-sd-webui-tagcomplete (和
谐Tag文件去这里取，有能力的可以去给颗star吗☛☚)

Tag来源 https://github.com/zcyzcy88/TagTable

## 提示词使用方法
仅支持英文提示词
仅支持英文提示词
仅支持英文提示词
将三个文件夹复制到WebUI的目录下即可，输入时就会有提示词
中文Tag分类使用方法
输入两个英文下划线开启（_）

## 如何制作自己的中文Tag文件
在 \scripts\wildcards 目录下新建txt文件即可，文件名将会被识别为分类
格式为 tag >> 翻译
最后将文件名写入 \tags\ wildcardNames.txt 文件下即可
更新文件后记得从设置重启WenUI刷新文件