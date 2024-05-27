import { Context, Schema, Time, Random, h, Dict, Session, HTTP, Logger } from 'koishi'
import * as fs from 'fs';
import * as  path from 'path';
import util from 'util'
import type {OneBot} from 'koishi-plugin-adapter-onebot'
// import { get } from 'http';
// import { stringify } from 'querystring';
const logger = new Logger('cave');

export const name = 'cave'

// export interface CaveDataMessage {
//   cave_id: number;
//   state: number;
//   contributor_id: string;
//   time: string;
// }

// export interface CaveDataObject {
//   cd_num: number
//   cd_unit: string
//   last_time: string
//   m_list: CaveDataMessage[]
// }

// export interface CaveDataGuild {
//   guild: number[]
// }



// export interface CaveData {
//   groups_dict: []
//   white_B: []
//   total_num: number
//   id_num: number
// }
export interface User {
  id: string
  name: string
  avatar?: string
}
export interface getStrangerInfo{
  user_id: number
  nickname: string
  sex: string
  age: number
}
export interface Config {
  manager: string[];
  consoleinfo: any;
  consolefor: any;
  nameinfo: any;
}
export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    manager: Schema.array(Schema.string())
      .required()
      .description('管理员QQ，一个项目填一个ID'),
    consoleinfo: Schema.boolean().default(false).description('日志调试模式'),
    consolefor: Schema.boolean().default(true).description('开启-g指令指定回声洞'),
    nameinfo:Schema.boolean().default(false).description('使用陌生人接口获取昵称'),
  })
])

//抄上学的
export async function saveImages(urls, selectedPath, safeFilename, imageExtension, config, session, ctx ){
  
    let url = urls;
    let fileRoot = path.join(selectedPath, safeFilename);
    let fileExt = `.${imageExtension}`;
    let targetPath = `${fileRoot}${fileExt}`;
    let index = 0; // 用于记录尝试的文件序号

    if (config.consoleinfo) {
      logger.info('提取到的图片链接：' + url);
    }

    while (fs.existsSync(targetPath)) {
      index++; // 文件存在时，序号递增
      targetPath = `${fileRoot}_${index}${fileExt}`; // 更新目标文件路径
    }
      
      // 下载并保存图片
    try {
      const buffer = await ctx.http.get(url);
      //logger.info('Downloaded ArrayBuffer size:', buffer.byteLength);
      if (buffer.byteLength === 0) throw new Error('下载的数据为空');
      await fs.promises.writeFile(targetPath, Buffer.from(buffer));
      return targetPath
      // 根据是否存在重名文件发送不同消息
      // if (index > 0) {
      // // 文件名有修改，包含序号
      // await session.send(`出现同名文件，已保存为 ${safeFilename}_${index}${fileExt}`);
      // } else {
      // // 未发现重名，直接保存
      //   }
      } catch (error) {
        logger.info('保存图片时出错： ' + error.message);
        await session.send(`保存图片时出错(函数内)：${error.message}`);
      
  }
    // return path.join(selectedPath, targetPath);
    if (config.consoleinfo) {
      logger.info('提取到的图片链接：' + targetPath);
    }
}
//根据文件名最大数字更改大小函数
export async function getFileCountPlusOne(dirPath: string){
  let maxNumber = 0;

  function traverseDir(dir: string) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const baseName = path.basename(file, path.extname(file));
      const number = parseInt(baseName, 10);

      maxNumber = Math.max(maxNumber, number);
    }
  }

  traverseDir(dirPath);
  return (maxNumber + 1).toString()
}

//检索json文件内的cave_id最大值+1
const readFile = util.promisify(fs.readFile);
export async function getMaxCaveId(filePath) {
  try {
    const data = await readFile(filePath, 'utf8');
    const objs = JSON.parse(data);

    // 检查objs是否是一个数组
    if (Array.isArray(objs)) {
      // 检查数组是否为空，或者数组中的第一个对象是否包含cave_id属性
      if (objs.length > 0 && 'cave_id' in objs[0]) {
        let maxCaveId = Math.max(...objs.map(obj => obj.cave_id));
        return (maxCaveId + 1);
      } else {
        console.log('Array is empty or objects do not have a cave_id property.');
        return 1;  // 如果数组为空或者找不到cave_id，返回1
      }
    } else {
      console.log('Data is not an array.');
    }
  } catch (err) {
    console.log(`Error reading file from disk: ${err}`);
  }
}

// 读取 JSON 文件
function readJsonFile(filePath: string): any[] {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    throw new Error(`读取文件出错: ${error.message}`);
  }
}

function writeJsonFile(filePath: string, data: any[]): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    throw new Error(`写入文件出错: ${error.message}`);
  }
}

// 随机抽取对象
function getRandomObject(data: any[]) {
  const index = Math.floor(Math.random() * data.length);
  return data[index];
}

// 解构并输出图片对象的函数
function destructureAndPrint(item: any) {
  const { path } = item;
    return path || '';
}

function destructureAndPrints(item: any) {
  const { text } = item;
  return text ? JSON.stringify(text, null, 2) : '';
}

function stringToUnicode(str: string): string {
  return str.split('').map(char => {
    const hex = char.charCodeAt(0).toString(16).padStart(4, '0');
    return `\\u${hex}`;
  }).join('');
}

function unicodeToString(str: string): string {
  return str.replace(/\\u([\dA-Fa-f]{4})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}
//删除绝对路径文件函数
async function deleteFiles(paths: string[]): Promise<void> {
  for (const filePath of paths) {
    try {
      await fs.promises.unlink(filePath);
    } catch (err) {
      console.error(`Error deleting file ${filePath}:`, err);
    }
  }
}

export async function apply(ctx: Context, config: Config) {
  interface CaveObject {
    cave_id: number;
    message?:{};
    contributor_id: string;
    state: number;
  }

  async function ensureDirExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, {recursive: true});
    }
  }
    // 写入 JSON 文件
  async function writeJSONFile(caveFilePath: string, data: any) {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(caveFilePath, jsonData, 'utf-8');
  }
    // 主要逻辑
    const caveDirPath = path.join(ctx.baseDir, 'data', 'cave');
    const cavePicturesDirPath = path.join(caveDirPath, 'pictures');
    const caveFilePath = path.join(caveDirPath, 'cave.json');
    const caveDataFilePath = path.join(caveDirPath, 'data.json');

    await ensureDirExists(caveDirPath);
    await ensureDirExists(cavePicturesDirPath);
    // 判断文件是否存在，如果不存在则创建
    async function ensureFileExists(caveDirPath: string) {
      if (!fs.existsSync(caveDirPath)) {
        fs.writeFileSync(caveDirPath, '[]', 'utf-8');
      }
    }
    async function ensureFileExistss(caveDirPath: string) {
      if (!fs.existsSync(caveDirPath)) {
        fs.writeFileSync(caveDirPath, '{}', 'utf-8');
      }
    }
    await ensureFileExists(caveFilePath);
    await ensureFileExistss(caveDataFilePath);
    
  ctx.command('cave [image]', '回声洞')
    .option('a', '-a 添加回声洞')
    .option('g', '-g 查看当前id的回声洞内容')
    .option('r', '-r 删除当前id的回声洞')
    // .option('c', '-c 设置当前群聊的回声洞冷却')
    // .option('m', '-m 获取新增投稿的审核情况')
    .action(async ({ session, options }, image) => {
      
    if(options.a){
      let quote = session.quote
      let imageURL: string
      let sessioncontent: string = session.content

      imageURL=h.select(sessioncontent, 'img').map(a =>a.attrs.src)[0]
      console.log(session.event.message)
      console.log(imageURL)
      if (!imageURL && !quote) {
        return '请输入内容或引用回复一条消息'}
      // let imageURL: string | Buffer | URL | ArrayBufferLike
      let elements = quote?.elements 
      let textContents = []
      let imgSrcs = []
      let message = []
        // 遍历elements数组
        console.log(elements)
        if (elements) {
      elements.forEach(element => {
        if (element.type === 'text') {
          textContents.push(stringToUnicode(element.attrs.content));
      } else if (element.type === 'img') {
    // 处理图像类型的元素
      imgSrcs.push(element.attrs.src);
      }
      })

      let textMessage = {
        "type": "text",
        "text": textContents.join(' ')
      };
      if(textContents.length>0){
      message.push(textMessage);
      }
      imageURL = imgSrcs[0]
    } else if(image) {
      let quotemessage: string | h[]
      quotemessage = session.quote?.content ?? image
      imageURL = h.select(quotemessage, 'img').map(a =>a.attrs.src)[0]
      }
      let selectedPath

      selectedPath = cavePicturesDirPath
      let safeFilename
      const getFile = await getFileCountPlusOne(cavePicturesDirPath)
      // console.log(getFile)
      safeFilename = getFile;

      const imageExtension = 'png'

      if (config.consoleinfo) {
      logger.info('用户输入： ' + imageURL);
      }

      let getcaveid = await getMaxCaveId(caveFilePath)
      let cave_id = getcaveid
      let contributor_id = quote?.user.id
      if(contributor_id === undefined){
        contributor_id = session.userId
      }
      let state = 1

      async function sendToManagers(messageElements: any) {
        const bot = ctx.bots[0];
        if (!bot) {
          logger.warn('未找到 bot 实例，无法发送私信给审核人员。');
          return;
        }
    
        for (const manager of config.manager) {
          await bot.sendPrivateMessage(manager, messageElements);
        }
      }
      try {
        if (imageURL) {
        const savedImagePath = await saveImages(imageURL, selectedPath, safeFilename,imageExtension, config, session, ctx);
        let imageMessage = {
          "type": "image",
          "path": savedImagePath
        };
        if(!savedImagePath){
          return '保存失败,请稍后重试(有多稍后取决于是否真的能下下来)'
        }
        message.push(imageMessage);
      }
      if(message.length===0){
        return `请不要引用合并转发,视频,语音等\n或消息在bot重启之前发送,无法寻找上下文`
      }
        let caveObject:CaveObject = {
          cave_id,
          message,
          contributor_id,
          state
        }
        let caveObjects = []
        caveObjects.push(caveObject)
        let rawdata = fs.readFileSync(caveFilePath)
        let existingMessages = JSON.parse(rawdata.toString());
        existingMessages.push(...caveObjects);
        let json = JSON.stringify(existingMessages, null, 2);

        fs.writeFile(caveFilePath, json, 'utf8', function(err) {
          if (err) {
            console.log("写入文件时出错：", err);
          } else {
            console.log("JSON 文件已成功保存！");
          }
        })
        await session.send(`添加成功,序号为 ${cave_id}\n提交者: ${contributor_id}`);
        let textContentss = unicodeToString(textContents.join(' '));
        if(imageURL){
          let messageElements = [
          `新的待审核回声洞(${cave_id})\n`,
          textContentss,
          h.image(imageURL),
          `—— ${contributor_id}`
        ];
        await sendToManagers(messageElements.join('\n'));
        // console.log(session.event.message)
      }else{
        let messageElements = [
          `新的待审核回声洞(${cave_id})\n`,
          textContentss,
          `—— ${contributor_id}`
        ];
        await sendToManagers(messageElements.join('\n'));
        // console.log(session.event.message)
      }
    } catch (error) {
        return `保存图片出错：${error.message}`;
          }
      }
      if(options.r){
        const data = await readJsonFile(caveFilePath);
        const imageNumber = Number(image);
        const managers = config.manager;
        
        if (!managers.includes(session.userId)) {
          await session.send('您没有权限执行此命令。');
          return;
        }
        if (isNaN(imageNumber)) {
          await session.send('请输入一个有效的回声洞序号。');
          return;
        }
        const caveToDelete = data.find(item => item.cave_id === imageNumber);
        //这行代码创建一个新的数组 updatedData，包含 data 中所有 cave_id 不等于 imageNumber 的对象。
        const updatedData = data.filter(item => item.cave_id !== imageNumber);
        //如果 updatedData 数组的长度与 data 数组的长度相同，说明没有找到对应的回声洞序号,也就是没有删除任何东西
      if (updatedData.length === data.length) {
        await session.send('未找到对应的回声洞序号。');
        return;
      }
      const messages = caveToDelete.message || []
      const filesToDelete = messages.map(message => message.path);
      // console.log(filesToDelete)
      await deleteFiles(filesToDelete);
      await writeJsonFile(caveFilePath, updatedData);
      await session.send(`回声洞序号 ${imageNumber} 已成功删除。`);
    
        }

      if(options.g){
        const data = await readJsonFile(caveFilePath);
        const imageNumber = Number(image);
        const managers = config.manager;
        if(!config.consolefor){
        if (!managers.includes(session.userId)) {
          await session.send('您没有权限执行此命令。');
          return;
        }
        }
        if (isNaN(imageNumber)) {
          await session.send('请输入一个有效的回声洞序号。');
          return;
        }

        const caveToFind = data.find(item => item.cave_id === imageNumber);
        if (!caveToFind) {
          await session.send('未找到对应的回声洞序号。');
          return;
        }else{
          const { cave_id, message, contributor_id, state } = caveToFind
          let texts =caveToFind.message.map(destructureAndPrints);
        let messages = caveToFind.message.map(destructureAndPrint);
        let filteredTexts = texts.filter(text => text !== undefined);
        console.log(contributor_id)
        let username = contributor_id
        if(config.nameinfo){
          const user = await ctx.bots[0].getUser(contributor_id)
          username = user.name
        }
        // let uuid = contributor_id.tosting()
        // console.log(uuid)
        // const user = await session.onebot.getStrangerInfo(contributor_id)
        // console.log(user)
        // let username = user.nickname
        // let username = user.name
        // if(username === undefined){
        //   username = "猜猜我是谁"
        // }
        // console.log(username)
        let chars = filteredTexts.map(text => {
          if (text !== undefined) {
            // 检查是否包含Unicode字符
            if (text.includes('\\u')) {
              let codePoints = text.split('\\u').filter(Boolean).map(hex => {
                let codePoint = parseInt(hex, 16);
                if (isNaN(codePoint)) {
                  return ''; // 返回空字符串以处理无效的代码点
                }
                return String.fromCodePoint(codePoint);
              });
              return codePoints.join('');
            } else {
              // 如果不是Unicode，直接返回
              try {
                return JSON.parse(`"${text.replace(/"/g, '\\"')}"`);
              } catch (e) {
                console.error(e);
                return text;
              }
            }
          }
          return '';
        });
        // console.log(chars);
        let str = chars.join('');
        if (!str) {
        const messageElements = [
          `回声洞 —— (${cave_id})`,
          `\n`,
          h('image', { src: messages.filter(msg => msg).join('\n')}), 
          `—— ${username}`
      ]
        session.send(messageElements);
        // console.log(messageElements);
    }else{
      const messageElements = [
        `回声洞 —— (${cave_id})`,
        `\n\n`,
        // h.transform(message, ),
        h.text(str), // 确保文本部分正确显示
        '\n\n', // 手动添加换行符
        h('image', { src: messages.filter(msg => msg).join('\n')}), 
        // '\n\n', // 手动添加换行符
        `—— ${username}`
    ]
      session.send(messageElements);
    }
        }
        }

      if(!options.a && !options.r && !options.g){
        const data = readJsonFile(caveFilePath);
        // 过滤出 state 值为 0 的对象
        const filteredData = data.filter(item => item.state === 0);

        if (filteredData.length === 0) {
            return session.send('没有找到符合条件的回声洞。');
        }

        const randomObject = getRandomObject(filteredData);
        const { cave_id, message, contributor_id, state } = randomObject;
  
        let texts =randomObject.message.map(destructureAndPrints);
        let messages = randomObject.message.map(destructureAndPrint);
        let filteredTexts = texts.filter(text => text !== undefined);
        console.log(contributor_id)
        // let uuid = contributor_id.tosting()
        // console.log(uuid)
        // const user = await ctx.bots[0].getUser(contributor_id)
        // let username = user.name
        // if(username === undefined){
        //   username = "猜猜我是谁"
        // }let username = contributor_id
        let username = contributor_id
        if(config.nameinfo){
          const user = await ctx.bots[0].getUser(contributor_id)
          username = user.name
        }
        // console.log(username)
        let chars = filteredTexts.map(text => {
          if (text !== undefined) {
            // 检查是否包含Unicode字符
            if (text.includes('\\u')) {
              let codePoints = text.split('\\u').filter(Boolean).map(hex => {
                let codePoint = parseInt(hex, 16);
                if (isNaN(codePoint)) {
                  return ''; // 返回空字符串以处理无效的代码点
                }
                return String.fromCodePoint(codePoint);
              });
              return codePoints.join('');
            } else {
              // 如果不是Unicode，直接返回
              try {
                return JSON.parse(`"${text.replace(/"/g, '\\"')}"`);
              } catch (e) {
                console.error(e);
                return text;
              }
            }
          }
          return '';
        });
        // console.log(chars);
        let str = chars.join('');
        if (!str) {
          const messageElements = [
            `回声洞 —— (${cave_id})`,
            `\n`,
            h('image', { src: messages.filter(msg => msg).join('\n')}), 
            `—— ${username}`
        ]
          session.send(messageElements);
          // console.log(messageElements);
      }else{
        const messageElements = [
          `回声洞 —— (${cave_id})`,
          `\n\n`,
          // h.transform(message, ),
          h.text(str), // 确保文本部分正确显示
          '\n\n', // 手动添加换行符
          h('image', { src: messages.filter(msg => msg).join('\n')}), 
          // '\n\n', // 手动添加换行符
          `—— ${username}`
      ]
        session.send(messageElements);
      }
        // console.log(messageElements);
        }
    })

    ctx.private().command('setcave <image>', '私聊审核')
    .option('t', '-t 私聊审核通过回声洞')
    .option('f', '-f 私聊审核不通过回声洞')
    .action(async ({ session, options }, image) => {
    const all = 'all';
    // let id: number;
    const data = readJsonFile(caveFilePath);
    let userid = session.event.user,id
    const managers = config.manager;
    if (options.t) {
      if (!managers.includes(session.userId)) {
        await session.send('您没有权限执行此命令。');
        return;
      }
    // 检查 image 是否为数字或 all
      if (isNaN(Number(image)) && image !== all) {
        await session.send('错误：image 参数只接受数字与ALL类型。');
        return;
    }
      try {
        if (image === all) {
        // 将所有 state 值为 1 的对象的 state 值更改为 0
          let updatedCount = 0;
          data.forEach(item => {
            if (item.state === 1) {
              item.state = 0;
              updatedCount++;
          }
        });
        // 写回更新后的数据
        writeJsonFile(caveFilePath, data);
        await session.send(`已通过(${updatedCount})个回声洞。`);
      } else {
        const imageNumber = Number(image);
        // 查找指定 cave_id 的对象并修改 state 值
        const targetItem = data.find(item => item.cave_id === imageNumber);
        if (targetItem && targetItem.state === 1) {
          targetItem.state = 0;
          writeJsonFile(caveFilePath, data);
          await session.send(`回声洞序号:(${imageNumber})已审核`);
        } else {
          await session.send(`未找到序号为(${imageNumber})的未审核回声洞。`);
        }
      }
    } catch (error) {
      await session.send(`读取或写入 JSON 文件时出错: ${error.message}`);
    }
  }

  if (options.f) {
    if (!managers.includes(session.userId)) {
      await session.send('您没有权限执行此命令。');
      return;
    }
    // 检查 image 是否为数字或 all
    if (isNaN(Number(image)) && image !== all) {
      await session.send('错误：image 参数只接受数字与ALL类型。');
      return;
  }
  try {
    if (image === all) {
      // 将所有 state 值为 1 的对象的 state 值更改为 2
      let updatedCount = 0;
      data.forEach(item => {
        if (item.state === 1) {
          item.state = 2;
          updatedCount++;
        }
      });
      // 写回更新后的数据
      writeJsonFile(caveFilePath, data);
      await session.send(`已不通过(${updatedCount})个回声洞。`);
    } else {
      const imageNumber = Number(image);
      // 查找指定 cave_id 的对象并修改 state 值
      const targetItem = data.find(item => item.cave_id === imageNumber);
      if (targetItem && targetItem.state === 1) {
        targetItem.state = 2;
        writeJsonFile(caveFilePath, data);
        await session.send(`回声洞序号:(${imageNumber})审核不通过`);
      } else {
        await session.send(`未找到序号为(${imageNumber})的未审核回声洞。`);
      }
    }
  } catch (error) {
    await session.send(`读取或写入 JSON 文件时出错: ${error.message}`);
  }
  }
});
    }
  

