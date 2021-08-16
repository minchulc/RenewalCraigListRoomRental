const fs = require('fs');
const fetch = require('node-fetch');
var HTMLParser = require('node-html-parser');

async function getSortedList(query, search, tableid, page, amount, topic, orderBy) {
    let query_;
    let result;
    
    
    let whiteList = [ "title", "content", "nick"];
    let include = false;
    whiteList.forEach(element => {
        if ( element === topic){ 
            include = true;
        }
    });


    let orderColumn = orderBy === undefined ? 'no': orderBy;
    let orderByList = ["readcount", "price", "title", "no" ];
    let orderInclude = false;
    orderByList.forEach(element => {
        if ( element === orderColumn){ 
            orderInclude = true;
        }
    });


    if (search && include && orderInclude) {
        query_ = `SELECT * FROM ${tableid} WHERE ${topic} LIKE ? order by ${orderColumn} desc limit ?,?`;
        result = await query(query_, [`%${search}%`, amount * (page - 1), amount]);
    } else {
        query_ = `select * from ${tableid} order by ${orderColumn} desc limit ?,?`;
        result = await query(query_, [amount * (page - 1), amount]);
    }
    console.log(query_);



    // if (orderBy) {
    //     query_ = `select * from ${tableid} order by readcount desc limit ?,?`;
    //     result = await query(query_, [amount * (page - 1), amount]);
    // } else {
    //     query_ = `select * from ${tableid} order by no desc limit ?,?`;
    //     result = await query(query_, [amount * (page - 1), amount]);
    // }
    console.log( result[0][0].no);

    return result[0];
}

function dividePage(list, page, amount) {
    if (amount === undefined) amount = 10;
    if (page <= 0) page = 1;
    let currentPageList = [];
    let init = (amount * page) - amount;
    let end = (init + amount);
    for (init; init < end; init++) {
        if (list[init]) {
            currentPageList.push(list[init]);
        } else { break; }
    }
    return currentPageList;
}

async function readArticle(query, no, tableid) {
    let result = await query(`select * from ${tableid} where no=?`, [no]);
    return { ...result[0][0] };
}

async function deleteArticle(query, no, tableid) {
    await query(`delete from ${tableid} where no=?`, [no]);
}

async function writeNew(query, title, nick, content, no, tableid, readcount) {
    let newmode = no === undefined;
    let date = getKoreanFormat(new Date());
    title = !title ? `${no}` : title;
    if (newmode) {
        await query(`insert into ${tableid} (title, nick, date, content, readcount) values (?,?,?,?,?)`, [title, nick, date, content, readcount]);
        no = (await query('SELECT LAST_INSERT_ID() as num'))[0][0].num;
    } else {
        await query(`update ${tableid} set title=?, nick=?, date=?, content=?, readcount=? where no=?`, [title, nick, date, content, readcount, no]);
    }

    return no;
}

function getKoreanFormat(date) {
    function numberFormat(no) {
        if ((no) < 10) {
            return "0" + no;
        }
        else {
            return no.toString();
        }
    }
    let format = [
        `${date.getFullYear()}년`,
        `${numberFormat(date.getMonth() + 1)}월`,
        `${numberFormat(date.getDate())}일`,
        `${numberFormat(date.getHours())}시`,
        `${numberFormat(date.getMinutes())}분`,
        `${numberFormat(date.getSeconds())}초`,
    ].join(' ');
    return format;
}

async function dataCrawling1(query, start) {
    let res = await fetch('https://orangecounty.craigslist.org/d/%EB%A3%B8-%EC-%B0%EC%96%B4/search/roo');
    res = await res.text();

    var root = HTMLParser.parse(res);
    let list = [...root.querySelectorAll('.result-heading>a')];
    for (let i = 0; i < list.length; i++) {
        let a = list[i];
        let url = `${a.getAttribute('href')}`;

        let body = await (await fetch(url)).text();
        let doc = HTMLParser.parse(body);

        let title = "none-title";
        if (doc.querySelectorAll('#titletextonly').length !== 0) {
            title = doc.querySelectorAll('#titletextonly')[0].innerText;
        }

        let price = 0;
        if (doc.querySelectorAll('.price').length !== 0) {
            price = doc.querySelectorAll('.price')[0].innerText;
            price = Number(price.split("$")[1].replace(',', ''));
        }

        let content = "empty-content";
        if (doc.querySelectorAll('#postingbody').length !== 0) {
            let seperator = "QR Code Link to This Post";
            content = (doc.querySelectorAll('#postingbody')[0].innerText);
            content = content.split(seperator);
            content = content[content.length === 1 ? 0 : 1].trim();
        }

        function twodigit(num) {
            let strNum = "";
            if (num - 10 < 0) {
                strNum = "0" + num;
            } else {
                strNum += num;
            }
            return strNum;
        }

        let location = "non-location";

        let link = (doc.querySelectorAll('div.mapbox>p.mapaddress>small>a')[0])?.getAttribute('href');

        let oriDate = (doc.querySelectorAll('#display-date>time'))[0].attributes.datetime;
        let dateObj = new Date(oriDate);
        let date = dateObj.getFullYear() + " " + twodigit(dateObj.getMonth() + 1) + " " + twodigit(dateObj.getDate());

        let readcount = 0;

        let json = ({
            no: (Number(url.split('/')[6].replace(".html", ""))), title, price, content, date, link, readcount
        });
        let obj;
        await writeNew(query, title, 'nick', content, undefined, 'craig', 0);
    }
};

if(false) {
    function aa({query,title,nick}){
        query

    }
    aa({
        query:'adsf',
        title:'dsfasdf',
        nick:'asdfaf'
    })
}



async function dataCrawling(start) {
    let end = start - 20;
    while (true) {
        let res = await fetch('http://www.slrclub.com/bbs/zboard.php?id=free&page=' + start);
        res = await res.text();
        var root = HTMLParser.parse(res);
        let list = [...root.querySelectorAll('.sbj>a')];
        for (let i = 0; i < list.length; i++) {
            let a = list[i];
            let title = a.innerText;
            let url = `http://www.slrclub.com${a.getAttribute('href')}`;
            let body = await (await fetch(url)).text();
            let doc = HTMLParser.parse(body);
            let nick = doc.querySelectorAll('td.nick>span')[0].innerText;
            let date = doc.querySelectorAll('td.date.bbs_ct_small>span')[0].getAttribute('title');
            let content = doc.querySelectorAll('div#userct')[0].innerHTML;
            let json = ({
                no: Number(url.split('?')[1].split('&').filter(a => a.indexOf('no=') === 0)[0].split('=')[1]),
                title, nick, date, content
            });
            await fs.promises.writeFile('/Users/minchulcho/Desktop/tutoring/project/board/datasave/data/' + json.no + '.json', JSON.stringify(json));
        }
        start--;
        if (start < end) {
            break;
        }
    }
};
module.exports = {
    getSortedList,
    dividePage,
    readArticle,
    writeNew,
    dataCrawling,
    deleteArticle,
    dataCrawling1,
};