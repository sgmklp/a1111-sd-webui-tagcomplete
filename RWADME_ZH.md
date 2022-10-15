# Booru tag autocompletion for A1111

[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/DominikDoom/a1111-sd-webui-tagcomplete)](https://github.com/DominikDoom/a1111-sd-webui-tagcomplete/releases)

## 项目地址和来源
插件原仓库 https://github.com/DominikDoom/a1111-sd-webui-tagcomplete
魔改后仓库 https://github.com/sgmklp/a1111-sd-webui-tagcomplete (和谐Tag文件去这里取，有能力的可以去给颗star吗☛☚)
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