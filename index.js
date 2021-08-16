const query = require('st-mysql')({ host: 'localhost', user: 'root', password: 'Qkkb2k19i@', database: 'craiglist' });
const fs = require('fs');
var HTMLParser = require('node-html-parser');
const fetch = require('node-fetch');
const express = require('express');
const {
    getSortedList,
    dividePage,
    readArticle,
    deleteArticle,
    writeNew,
    dataCrawling,
    dataCrawling1,
    orderBy
} = require('./tools/datatool');


function getDBPath(id) {
    return id;
}

let app = express();
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

let turnOn = false; 
async function createTable(name) {
    let createTalbe = `
    create table ${name}(
        no int(8) NOT NULL AUTO_INCREMENT,
        title TEXT NOT NULL,
        nick VARCHAR(255) NOT NULL,
        date VARCHAR(255) NOT NULL,
        content LONGTEXT,
        readcount int(8) NOT NULL default 0,
        PRIMARY KEY ( no )
     );
    `;
    await query(createTalbe);
}

app.get("/createtable/:name", async (req, res) => {
    await createTable(req.params.name);
    res.send();
});

app.get("/list", async (req, res) => {
    let topic;
    let orderButtom = 0; 
    let orderBy = (req.query.orderBy);
    
    let amount = 20;
    let totalLength = (await query('select count(*) as cnt from craig'))[0][0].cnt;
    let page = Number(undefined === req.query.page ? '1' : req.query.page);
    let dpath = getDBPath(req.query.tableid);
    let titleList;
    if (orderBy) {
        titleList = await getSortedList(query, req.query.search, dpath, page, amount, req.query.topic, orderBy);
    }
    else { 
        titleList = await getSortedList(query, req.query.search, dpath, page, amount, req.query.topic);
    }
    
    if (!titleList) {
        await createTable(dpath);
        titleList = [];
    }
    let pre = page - 1;
    if (pre < 1) pre = 1;
    let next = page + 1;
    let lastpage = (((totalLength - (totalLength % amount)) + ((totalLength % amount > 0) ? amount : 0)) / amount)
    next = next > lastpage ? next - 1 : next;
    if (next === titleList.length / 10) next = next;

    res.render('list', {
        titleList, pre, next, page,
        search: req.query.search,
        tableid: req.query.tableid,
        orderBy,//: req.query.orderBy,
        topic
    });
})

app.get("/content/:no", async (req, res) => {
    
    let dpath = getDBPath(req.query.tableid);
    let no = Number(req.params.no);
    let data = await readArticle(query, no, dpath);
    console.log(data);
    console.log(data.readcount);
    data.readcount = (data.readcount === undefined ? 0 : data.readcount);
    data.readcount++;
    await writeNew(query, data.title, data.nick, data.content, no, dpath, data.readcount);
    let page = req.query.page;
    res.render('content', { data, page, tableid: req.query.tableid, readcount: data.readcount, orderBy : req.query.orderBy });
})



app.get("/new", async (req, res) => {
    res.render("new", { data: {}, tableid: req.query.tableid })
});

app.get("/edit", async (req, res) => {
    let dpath = getDBPath(req.query.tableid);
    let file = req.query.no;
    let data = await readArticle(query, file, dpath);
    res.render("new", { data, tableid: req.query.tableid })
});

app.get("/submit", async (req, res) => {
    let dpath = getDBPath(req.query.tableid);
    let title = req.query.title;
    let nick = req.query.nick;
    let content = req.query.content;
    let no;
    let readcount = 0;
    if (req.query.no) {
        no = req.query.no;
        let data = await readArticle(query, no, dpath);
        readcount = data.readcount === undefined ? 0 : data.readcount;
    }
    no = await writeNew(query, title, nick, content, no, dpath, readcount);

    let tableid = req.query.tableid ? req.query.tableid : '';
    res.redirect('/content/' + no + '?page=1&tableid=' + tableid);
});

app.get("/delete", async (req, res) => {
    let dpath = getDBPath(req.query.tableid);
    let file = req.query.no;
    await deleteArticle(query, file, dpath);
    let tableid = req.query.tableid ? req.query.tableid : '';
    res.redirect('/list?page=1&tableid=' + tableid);
});

app.get("/update", async (req, res) => {
    await dataCrawling(733549);
    res.end();
});

app.get("/update2", async (req, res) => {
    await dataCrawling1(query, 733549);
    res.end();
});

app.listen(3000);