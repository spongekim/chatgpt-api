import http from 'http'
import url from 'url'
import querystring from 'querystring'
import dotenv from 'dotenv-safe'
import { oraPromise } from 'ora'
import * as fs from 'fs'

import { ChatGPTAPI } from '../src'

dotenv.config()

/**
 * Demo CLI for testing conversation support.
 *
 * ```
 * npx tsx demos/demo-conversation.ts
 * ```
 */

var api
var cid = ""
var mid = ""
var sid = ""
var cached_img_path = ""

async function init(){

  api = new ChatGPTAPI({
    apiKey: process.env.OPENAI_API_KEY,
    debug: false
  })
  
    /*let prompt = "From now on you will pretend to be an agent of smart home. Here is the list of devices we have: - A light in the bathroom. - A cleaning robot in the living room. - An air conditioner in the bedroom. That's all the devices we have. Pay attention to their location. If question is about smart home your response should be the proper command send to smart home voice assistant. Also, your answer should obey following rules: 1. You can only operate device match it's location. 2. When a location has no suitable device you should response we don't some kind of required device."
    let res = await oraPromise(
    api.sendMessage(prompt), 
    {
      text: prompt
    }
   )
  cid = res.conversationId
  mid = res.id
  console.log(res)*/
}


async function Ask1(prompt){
  console.log('Question: ' + prompt + '\n')
  if(cid == ""){
    let res = await oraPromise(
      api.sendMessage(prompt), 
      {
        text: prompt
      }
     )
    cid = res.conversationId
    mid = res.id
    console.log(res)
    return res.text
  }
  else{
    let res = await oraPromise(
      api.sendMessage(prompt, {
        conversationId: cid,
        parentMessageId: mid
      }),
      {
        text: prompt
      }
    )
    cid = res.conversationId
    mid = res.id
    console.log(res)
    return res.text 
  }
}

async function fetchUrl(url: string): Promise<Response> {
    try {
        const response = await fetch(url);
        const data = await response.text()
        console.log(data)
        return data;
    } catch (error) {
        console.error(`Error fetching URL: ${error}`);
    }
}

async function Ask2(prompt){
  console.log('draw picture: ' + prompt + '\n')
  let res = await oraPromise(
      fetchUrl('http://127.0.0.1:8100?&text=' + encodeURIComponent(prompt))
   )
  return res
}

async function Ask3(prompt){
  console.log('ner: ' + prompt + '\n')
  let res = await oraPromise(
      fetchUrl('http://127.0.0.1:8200?&text=' + encodeURIComponent(prompt))
   )
  return res
}

async function finish(){
  await api.closeSession()
}

async function app(req, res){
  var urlObj = url.parse(req.url)
  var queryObj = querystring.parse(urlObj.query)
  var text = queryObj['text']
  var type = queryObj['type']
  var pre_sid = sid
  sid = queryObj['sid']
  
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain')
  
  var response_body = new Object
    
  if(type == 'draw'){
    if(sid == pre_sid){
      fs.readFile(cached_img_path, (err, data) => {
        if (err) throw err;
        res.end(data);
      });
      return;
    }
  
    var ans = await Ask2(text)
    cached_img_path = ans
    fs.readFile(ans, (err, data) => {
      if (err) throw err;
      res.end(data);
    });
  }
  else if(type == 'chat')
  {
    var ans = await Ask1(text)
    response_body.type = type
    response_body.data = ans    
    res.end(JSON.stringify(response_body))
  }
  else if(type == 'ner')
  {
    var ans = await Ask3(text)
    response_body.type = type
    response_body.data = ans   
    res.end(JSON.stringify(response_body))
  }
}

init()
const server = http.createServer(app)

server.listen(8000, () => {
  console.log('runing...')
})

