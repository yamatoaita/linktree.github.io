
// ----- utils.js START -----
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, push,  get, set, onChildAdded, remove, onChildRemoved }
from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

class FirebaseFunctions{
    constructor(FIREBASE_CONFIG){
        // Initialize Firebase
        const APP = initializeApp(FIREBASE_CONFIG);
        this.DB = getDatabase(APP);
        this.DB_REF_COOKIE =  ref(this.DB, `data/cookie`);

        this.__initTipFlg();

    }

    uploadExpiringCookie(data, EXPIRE_AFTER_X_TIME = 3000){
        var expire = new Date();
        expire.setTime(expire.getTime()+EXPIRE_AFTER_X_TIME);

        const DB_REF_DATA =  ref(this.DB, "data/cookie");

        //この関数を使用するとき、様々なデータを扱うだろう
        //例えばログイン状態を一時的に保存するために使われる。
        //他には、遷移先のページで実行させたい動作を保存するかもしれない。
        //(例：一度ログイン画面を経由して、設定画面に移動したい時にGogingToSetting:trueのように使う)
        //様々な種類のデータを扱うため、object型で  data.isloginとかdata.isGoingSettingのように
        //使ったほうが　コードが読みやすくなると考えた。そのため、dictionary型を推奨することを
        //console logで表示させる。バグのもとになりそうだからだ。
        if(typeof(data)=="object" && Array.isArray(data) == false){
            //推奨されるデータ型です
        }else{
            this.__showCaution("uploadExpiringCookie",data);
        }


        const LIST_DATA = [expire,data];
        const JSON_DATA = JSON.stringify(LIST_DATA);

        set(DB_REF_DATA,JSON_DATA);
    }


    uploadData(rawPath,data){
        rawPath = `data/${rawPath}`;
        var reviewdPath = this.__reviewPath(rawPath);

        const DB_REF_DATA =  ref(this.DB, reviewdPath);
        if(typeof(data)=="string"){
            data = ["json",data];
            //JSONにするには、配列でなければならない。
            //そのため、0番目に識別子jsonをつけて配列にする
        }
        const JSON_DATA = JSON.stringify(data);
        set(DB_REF_DATA,JSON_DATA);
    }

    async downloadExpiringCookie(){
        this.__tellTips("downloadData");

        const DB_REF_DATA = ref(this.DB,"data/cookie");
        try {
            const snapshot = await get(DB_REF_DATA); // await で結果を待機
            if (snapshot.exists()) { // パスワードが登録されていた場合
                const JSON_DATA = snapshot.val(); // データを格納

                if(typeof(JSON_DATA)=="string"){
                    var parsedData = JSON.parse(JSON_DATA);
                }else{
                    var parsedData = JSON_DATA;
                }

                let EXPIRE_DATE = new Date(parsedData[0]); // cookie_dateを格納
                let CURRENT_DATE = new Date(); // 現在の時刻を取得

                // cookie_dateから現在時刻までの経過時間をミリ秒で取得
                let ELAPSED_TIME    = EXPIRE_DATE    - CURRENT_DATE;
                // 1000ms(  valid)  = 12:00:03       -  12:00:02
                //    1ms(  valid)  = 12:00:03:0000  -  12:00:02:999
                //    0ms(invalid)  = 12:00:03       -  12:00:03
                //-2000ms(invalid)  = 12:00:03       -  12:00:05

                if (ELAPSED_TIME > 0) {
                    this.__uploadAndResetInfo();
                    const DICT_DATA =  parsedData[1];
                    return DICT_DATA; // 取得したデータを返す
                } else {
                    //ログイン情報の有効期限が切れた場合は、falseを返す
                    this.uploadData("data/info",`Cookieの有効期限が切れています。
有効期限：EXPIRE_DATE
現在時刻：18
時差：${ELAPSED_TIME/1000}秒`)
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return false;
                }



            } else {
                console.log('No data available');
                return null;
            }
        } catch (error) {
            this.__alertMessage(error);
            console.error('Error getting data:', error);
            throw error; // エラーを呼び出し元に伝える
        }
    }

    async downloadData(rawPath) {
        this.__tellTips("downloadData");

        rawPath = `data/${rawPath}`;
        var reviewedPath = this.__reviewPath(rawPath);
        const DB_REF_DATA = ref(this.DB, reviewedPath);

        try {
            const snapshot = await get(DB_REF_DATA); // await で結果を待機
            if (snapshot.exists()) { // パスワードが登録されていた場合
                const JSON_DATA = snapshot.val(); // データを格納

                if(typeof(JSON_DATA)=="string"){
                    var parsedData = JSON.parse(JSON_DATA);
                }else{
                    var parsedData = JSON_DATA;
                }




                if(Array.isArray(parsedData)){
                    if(parsedData.length >0 && parsedData[0]==="json"){
                        //配列が空だと次の処理が undefined errorとなる。
                        //これを防ぐために parsedData.length>0の条件をはさむ。
                        parsedData = parsedData[1];
                        //JSONは配列やobject型じゃなければパースできない。
                        //そのため、listに直してからパースしている。
                        //データを取り出す時には、元のデータ（文字列や数値）のみ抽出して返す
                    }
                }

                return parsedData; // 取得したデータを返す
            } else {
                console.log('No data available');
                return null;
            }
        } catch (error) {
            this.__alertMessage(error);
            console.error('Error getting data:', error);
            throw error; // エラーを呼び出し元に伝える
        }
    }

    __uploadAndResetInfo(){
        this.uploadData("data/info","");
    }

    __reviewPath(PATH){
        return PATH.replace(/(?:\/?data\/)+/, "data/");
        //:  / /は正規表現を宣言
        //:  /は/のエスケープ文字
    }

    __alertMessage(INFO){
        alert(`Error: yamatoaita@gmail.comにこの文章をお知らせください。
Error info : INFO`)
    }

    __initTipFlg(){
        this.isShowTip = {
                            "downloadData" : true

                        }
    }

    __tellTips(METHOD){
        const GREEN = "color:green";
        const RED = "color:red";
        const BLUE = "color:blue";
        const NORMAL = "color:black;font-weight:normal"
        const BOLD  ="font-weight:bold`"

        if(METHOD == "downloadData" && this.isShowTip["downloadData"]){
            this.isShowTip["downloadData"] = false;

            console.log(
`
============================================================================
|                       %cTip of [downloadData]%c:                             |
|--------------------------------------------------------------------------|
|downloadDataメソッドを実行する際は以下のように使います。                  |
|--------------------------------------------------------------------------|
|    class ClassName{                                                      |
|        constructor(){                                                    |
|            ・・・処理・・・                                              |
|            this.init(); // データ取得後に実行させたいコードは            |
|                        // init関数にくくる。                             |
|        }                                                                 |
|        %casync%c init(){                                                     |
|            const DATA = %cawait%c this.FIREBASE_APP.downloadData("cookie");  |
|            console.log(データが取得後に表示されます‘＄{DATA}‘)         |
|            console.log("このログはその後に表示されます")                 |
|        }                                                                 |
|    }                                                                     |
|--------------------------------------------------------------------------|
|                %cReturnで値を取得したい場合の記載例%c:                       |
|--------------------------------------------------------------------------|
|    %casync%c exampleFunction(){                                              |
|          const VALUE = %cawait%c this.returnFunction();                      |
|    }                                                                     |
|    %casync%c returnFunction(){                                               |
|        const RETURN_VALUE = %cawait%c this.FIREBASE_APP.downloadData("path");|
|        return RETURN_VALUE;                                              |
|    }                                                                     |
|--------------------------------------------------------------------------|
|                %caddEventListenerで行う場合の記載例%c:                       |
|--------------------------------------------------------------------------|
|    setBtnEvent(){                                                        |
|        const BTN = document.getElementById("btn");                       |
|        BTN.addEventListener("click", %casync%c ()=>{                         |
|            const VALUE = %cawait%c this.returnFunction();                    |
|        })                                                                |
|    }                                                                     |
============================================================================
    ` ,`GREEN;BOLD`,`NORMAL`,
    `BLUE;BOLD`,`NORMAL`,
    `BLUE;BOLD`,`NORMAL`,

    `GREEN;BOLD`,`NORMAL`,
    `BLUE;BOLD`,`NORMAL`,
    `BLUE;BOLD`,`NORMAL`,
    `BLUE;BOLD`,`NORMAL`,
    `BLUE;BOLD`,`NORMAL`,

    `GREEN;BOLD`,`NORMAL`,
    `BLUE;BOLD`,`NORMAL`,
    `BLUE;BOLD`,`NORMAL`
   )
        }
    }

    __showCaution(FUNCTION_NAME,ITEM){
        var stack = new Error().stack.replace("Error","");
        stack = stack.replace(/^\s*at FirebaseFunctions.*$/gm, "");


        if(FUNCTION_NAME=="uploadExpiringCookie"){
            alert(`注意 : アップロードしようとしているものはDictionary型ではありません。

uploadExpiringCookie関数は仕様上、Dictionary型を渡すことを推奨します。

渡された値：ITEM   データ型：${typeof(ITEM)}

現在の行番号：stack`)
        }
    }

}

class UtilsFunctions{
    constructor(){

    }

    /**
     * @abstract 注意事項:sleepを使う際は使用する関数にasyncをつけ、await sleepとして使います。
     * @param {*} MS 
     * @returns 
     */
    sleep(MS){
        console.log(`注意事項\nsleepを使う際は使用する関数にasyncをつけ、await sleepとして使います。`)
        return new Promise(resolve => setTimeout(resolve,MS));
    }
}

class HtmlFunction{
    constructor(){

    }
    extractHtmlTitle(htmlLink){
        //https:yamatoaita.github.io/page-tile.github.io/
        //http://127.0.0.1:5500/parent-file-name/page-title.html
        //https://yamatoaita.github.io/scheduler.github.io/adjust.html?user_index=user

        htmlLink = htmlLink.replace(/\/$/,"");
        //https:yamatoaita.github.io/page-title.github.io
        //http://127.0.0.1:5500/parent-file-name/page-title.html
        //https://yamatoaita.github.io/scheduler.github.io/adjust.html?user_index=user

        var configured_item = htmlLink.split("/").pop();
        //page-title.github.io
        //page-title.html
        //adjust.html?user_index=user

        const HTML_TITLE = configured_item.match(/^(.+)(?:\.github\.io|\.html)/)[1];
        //正規表現の解説
        //^(.+)で文字の頭にある何文字かの文字列をキャプチャする
        //?:で「これは非キャプチャグループです。ORのために使っています」と宣言
        //(?:  \.github\.io | \.html)で.github.ioか.htmlを指定している。
        //最後、[1]とすることで一番目のキャプチャ内容を取得する

        //結果の例
        //page-title
        //page-title
        //adjust

        return HTML_TITLE;
    }

    /**
     * @description -ローカル環境とgithub.pageではurlの形式が異なります。そのため、ページ事に遷移先のURLを別処理で作成する必要があるのです。
     * @param {*} URL -URL:window.location.hrefがデフォルト値
     * @param {*} PAGE_TITLE -PAGE_TITLE:遷移先のページ名を指定
     * @returns 指定したページ名を含むURLリンクを返します。
     *
     */
    composeURLbyPageTitle(PAGE_TITLE,URL=window.location.href){
        /*[URLの例]
        【ローカル環境】

        http://127.0.0.1:5500/parent-file-name/page-title.html

        （例1）https://yamatoaita.github.io/ホームページ名.github.io/
        （例2）https://yamatoaita.github.io/ホームページ名.github.io/サブページ名.html
        （例3）https://yamatoaita.github.io/ホームページ名.github.io/サブページ名.html?user_index=user

        →ローカル環境とgithub.pageで条件分岐しよう。
        　ローカル環境の場合は正規表現で置換

        [github.pageの場合]
        github.pageの場合は末尾に/サブページ名.htmlを追加しよう。
        ↓↓
        （例1）〇　https://yamatoaita.github.io/ホームページ名.github.io/サブページ名.html
        （例2）✖　https://yamatoaita.github.io/ホームページ名.github.io/サブページ名.html/サブページ名.html
        （例3）✖  https://yamatoaita.github.io/ホームページ名.github.io/サブページ名.html?user_index=user/サブページ名.html

        もしURLがすでにサブページ出会った場合は違う処理をしよう。サブページを抽出し、PAGE_TITLEに置換する。


        github.pageはhttps://yamatoaita.github.io/ホームページ名.github.io/サブページ名.html
        という形式だ。
        PAGE_TITLEがホームページ名と一緒になることはない。↓

        ✖ https://yamatoaita.github.io/INDEX.github.io/INDEX.html

        そのため、FUNDATIONAL_URLのホームページ名とPAGE_TITLEが違う名前か確かめないとね。

        〇https://yamatoaita.github.io/scheduler.github.io/adjust.html
        */


        /*
        1.ローカル環境かgithub.pageか判断し、条件分岐する　： if(URL.match(/github/)){}

            Local.1. 正規表現を使って、page-title.htmlの部分を置換する。
            　　　　　（例）http://127.0.0.1:5500/utils/index.html
            　　　　　　　→ http://127.0.0.1:5500/utils/login.html

            Github.1. ホームページ名のみの基本URLを抽出する : URL.match(/https:\/{2}yamatoaita.github.io\/[\w-]*\.github\.io\//)[0];
            　　　　　（例1）https://yamatoaita.github.io/ホームページ名.github.io/
                        → https://yamatoaita.github.io/ホームページ名.github.io/

                    （例2）https://yamatoaita.github.io/ホームページ名.github.io/サブページ名.html
                        → https://yamatoaita.github.io/ホームページ名.github.io/

                    （例3）https://yamatoaita.github.io/ホームページ名.github.io/サブページ名.html?user_index=user/サブページ名.html
                        → https://yamatoaita.github.io/ホームページ名.github.io/

            Github.2. ホームページ名と変更したいPAGE_TITLEが同じか判断し、条件分岐する
            　　　　　　合致した場合は無効なURLとなるため、alertでお知らせする。

            Github.3.　現在のＵＲＬはサブページか判断して、条件分岐する。
            　　　　
                Github.4.hp.   ＵＲＬの末尾にPAGE_TITLE.htmlを加える。

                Github.4.subp. ＵＲＬ（https://yamatoaita.github.io/ホームページ名.github.io/サブページ名.html）
                　　　　　　　　 のサブページ名をPAGE_TITLEに置換する。
        */

        if(URL.match(/github/)){//1

            const FUNDATIONAL_URL =  URL.match(/https:\/{2}yamatoaita.github.io\/[\w-]*\.github\.io\//)[0];
            //                                  https:  \ yamatoaita.github.io \ hp-name\.github.io \
            //Github.1.
            //→https://yamatoaita.github.io/ホームページ名.github.io/サブページ名.html   から
            //→https://yamatoaita.github.io/ホームページ名.github.io/　　　　　　　　　  が抽出される。

            const FUNDATIONAL_PAGE_NAME = this.extractHtmlTitle(FUNDATIONAL_URL);
            if(FUNDATIONAL_PAGE_NAME == PAGE_TITLE){ // Github.2.
                alert("ホームページ名とPAGE_TITLEは違う名前でなければなりません。\n〇　https://yamatoaita.github.io/ホームページ名.github.io/サブページ名.html")
                //無効なURL✖　 https://yamatoaita.github.io/ホームページ名.github.io/ホームページ名.html
            }else{
                if(URL.match(/\.html$/)){//Github.3. サブページ名にのみ　末尾に.htmlがつくのです。
                    var composedURL = URL.replace(/\/[\w]*\.html$/,`/${PAGE_TITLE}.html`);
                    //                             /subpage.html  , / page-title  .html　　　に置換
                    //Github.4.subp
                    return composedURL;
                }else{
                    var composedURL = `${URL}${PAGE_TITLE}.html`;
                    //                ・・・/   page-title .html　　　末尾に加える
                    //Github.4.hp.

                    return composedURL;
                }
            }

        }else{
            var composedURL = URL.replace(/\/([\w]*)\.html$/,`/${PAGE_TITLE}\.html`)
            //　　　　　　　　　　　　　　　　/  target .html　,　/  page-title .html
            //Local.1.
            return composedURL;
        }
    }

    /**
     * @description ホームページのURLを作り返します。ローカル環境とgithub.pageでは処理を変えています。どちらもURLはwindow.location.hrefで取得したものを使用します。
     * @param {*} homePageTitle homePageTitleはローカル環境で使用します。デフォルトがindexです。github.pageにアップしたのちには読み込まれません。
     * @returns 　http://127.0.0.1:5500/utils/index.htmlやhttps://yamatoaita.github.io/scheduler.github.ioのように返します。
     */
    returnHomePageURL(homePageTitle="index"){
        const URL =window.location.href;


        if(URL.match(/github/)){
            var homePageURL =  URL.match(/https:\/{2}yamatoaita.github.io\/[\w-]*\.github\.io\//)[0];
            return homePageURL;
        }else{
            var homePageURL = this.composeURLbyPageTitle(homePageTitle,URL);
            return homePageURL;
        }
    }
}

class AnimateFunctions{
    constructor(){

    }

    /**
     * @abstract フェードスピードの初期値は0.05です。
     * @param {*} ELEMENT 
     * @param {*} SPEED 
     */
    fadeIn(ELEMENT, SPEED=0.05){
        var opacity = 0;//透明度
        ELEMENT.style.opacity = 0;
        ELEMENT.style.display = "block";

        const FADE_EFFECT = setInterval( () =>{

                                                if(opacity < 1){//非　透明でなければ
                                                    opacity += SPEED;
                                                    ELEMENT.style.opacity = opacity;
                                                }else{
                                                    clearInterval(FADE_EFFECT);
                                                }

                                               }, 50);//0050ms秒ごとに実行
    }

    /**
     * @abstract フェードスピードの初期値は0.05です。
     * @param {*} ELEMENT 
     * @param {*} SPEED 
     */
    fadeOut(ELEMENT,SPEED=0.05){
        var opacity = 1;//透明度
        const FADE_EFFECT = setInterval( () =>{

                                                if(opacity > 0){//完全に透明でなければ
                                                    opacity -= SPEED;
                                                    ELEMENT.style.opacity = opacity;
                                                }else{
                                                    clearInterval(FADE_EFFECT);
                                                    ELEMENT.style.display = "none";
                                                }

                                               }, 50);//0050ms秒ごとに実行
    }
}

class PreLoader{ 
    #PRELOADER_MODAL
    #STYLE
    constructor(){

        // 1. プリローダーHTMLを追加
        this.#PRELOADER_MODAL = document.createElement("div");
        this.#PRELOADER_MODAL.className = "preloader";
        document.body.prepend(this.#PRELOADER_MODAL);
    }


    /**
     * @abstract 滝のようにLOADTINGの文字が流れます
     * @description BACKGROUND_COLORでモダールの背景色を指定
     * ANIMATE_COLOR_PATTERNはリスト型に３色の色を指定。アニメ指定した文字色になる
     * BASIC_FONT_COLORで非アニメ指定文字の色を指定
     */
    charWaterflow({
        BACKGROUND_COLOR = `rgba(0, 0, 0, 0.8)`,
        ANIMATE_COLOR_PATTERN = [`#0088cc`,`#e23069`,`#F0E300`],
        BASIC_FONT_COLOR = `rgb(255, 255, 255)`
    }={}){

        //1. HTMLを追加
        this.#PRELOADER_MODAL.innerHTML = `
            <img src="labo-logo.png" class="labo-logo" id="labo-logo">
            <div class="loading">
                <span>L</span>
                <span class="animate">O</span>
                <span class="animate">A</span>
                <span class="animate">D</span>
                <span>I</span>
                <span>N</span>
                <span>G</span>
            </div>
        `;

        //２. CSSを追加
        this.#STYLE = document.createElement("style");
        var   basicStyleContext =  `
        .preloader {
            position: fixed;
            top: 0px;
            background-color: ${BACKGROUND_COLOR};
            width: 100%;
            height: 100%;
            z-index: 99;
        }
        .labo-logo { 
            position: relative;
            top: 30%;
            margin: auto;
            display: block;
            width: auto;
        }
        @keyframes spin {
            0% { top: 0; }
            50% { top: 100%; opacity: 0; }
            51% { top: -100%; }
            100% { top: 0; opacity: 1; }
        }

        .loading {
            position: relative;
            top: 32%;
            width: 100%;
            text-align: center;
          }
          
          .loading span {
            color: ${BASIC_FONT_COLOR};
            font-size: 30px;
          }
          
          .loading .animate {
            position: absolute;
            top: 0;
          }       
        `;
        var   animateStyleContext = `
            .loading span:nth-child(2) {
                color: ${ANIMATE_COLOR_PATTERN[0]};
                animation: spin 1.5s linear infinite;
                -webkit-animation: spin 1.5s linear infinite;
            }

            .loading span:nth-child(3) {
                margin-left: 25px;
                color: ${ANIMATE_COLOR_PATTERN[1]};
                animation: spin 1s linear infinite;
                -webkit-animation: spin 1s linear infinite;
            }

            .loading span:nth-child(4) {
                margin-left: 50px;
                color:${ANIMATE_COLOR_PATTERN[2]};
                animation: spin 1.25s linear infinite;
                -webkit-animation: spin 1.25s linear infinite;
            }

            .loading span:nth-child(5) {
                padding-left: 77px;
            }
        `;
        this.#STYLE.textContent = basicStyleContext + animateStyleContext;
        document.head.appendChild(this.#STYLE);

    }

    async closePreLoader(){
        const AnimateFunc = new AnimateFunctions();
        const UtilsFunc   = new UtilsFunctions();

        AnimateFunc.fadeOut(this.#PRELOADER_MODAL);
        await UtilsFunc.sleep(1000);
        this.#PRELOADER_MODAL.remove();
        this.#STYLE.remove();
    }
}
// ----- utils.js END -----


class Application{
    constructor(){
        //➀Elementを取得
        this.INPUT_SINCE          = document.getElementById("dateSince");
        this.SPAN_SINCE           = document.getElementById("explainDateSince");

        this.INPUT_UNTIL         = document.getElementById("dateUntil");
        this.SPAN_UNTIL          = document.getElementById("explainDateUntil");

        this.BUTTON_ENTER         = document.getElementById("enterBtn");

        this.SINCE_DATE           = document.getElementById("dateSince");
        this.UNTIL_DATE           = document.getElementById("dateUntil");

        this.isLogin = false;
        //このbooleanを使用して、サイトがログイン状態か
        //ログアウト状態かを管理したい。

        const FIREBASE_CONFIG = {
            apiKey: "AIzaSyBYf6N1S-oMoHvJFGmLvlJ9t1WBsiSy2XQ",
            authDomain: "x-linktree.firebaseapp.com",
            databaseURL: "https://x-linktree-default-rtdb.firebaseio.com",
            projectId: "x-linktree",
            storageBucket: "x-linktree.firebasestorage.app",
            messagingSenderId: "207042084073",
            appId: "1:207042084073:web:e305b706b65b4d6e718478"
        };
        this.FirebaseApp     = new FirebaseFunctions(FIREBASE_CONFIG);

        this.HtmlFunction    = new HtmlFunction();

        this.UtilsFunction   = new UtilsFunctions();

        this.AnimateFunction = new AnimateFunctions();

        if(this.__isInSetting()){//設定ページにいたら
            this.transitioningHP_IfInvalid();
            //クッキーが有効期限外の時にHPに遷移する
        }
        
        this.executeByURL();

    }
    //--------------------------------------------------------------------------
    //[common]
    

    async executeByURL(){
        const URL = window.location.href;

        if(URL == this.HtmlFunction.returnHomePageURL()){
            this.setRadioEvent();//ラジオボタンの選択状況に応じて、elementを表示させる

            this.setButtonEvent();//確定ボタンのイベントを設定

            this.setA_Event();//リンククリック時の色変化を設定

            this.setMenuEvent();

            this.setMenuBtnsEvent();

            const PRELOADER =  new PreLoader();
            PRELOADER.charWaterflow();

            if(await this.__isCookieValid()){
                this.applyLoginIfNotExpire();
            }else{
                this.setLastUsedOption();
            }

            await this.UtilsFunction.sleep(1000);
            PRELOADER.closePreLoader();

            //ヘッダーにラボロゴを表示
            this.setLaboLogo();
            
            
        }else if(URL == this.HtmlFunction.composeURLbyPageTitle("login")){
            this.setLoginEvent();
            this.setHomeBtnEvent();

        }else if(URL == this.HtmlFunction.composeURLbyPageTitle("setting")){
            this.setComboboxEvent();
            this.setBtnsEvent();
            this.setHomeBtnEvent();
      
            this.applyLoginIfNotExpire();         
        }else{
            alert("error:無効なURLです。in executeByURL")
        }
    }

    setLaboLogo(){
        const LABO_LOGO = document.getElementById("headerLaboLogo");
        this.AnimateFunction.fadeIn(LABO_LOGO,0.04);

        LABO_LOGO.addEventListener("click",()=>{
            window.location.href = "https://sites.google.com/view/syuubunndou/%E3%83%9B%E3%83%BC%E3%83%A0";
        })
    }

    async printFirebaseInfo(){
        const INFO = await this.FirebaseApp.downloadData("data/info");
        console.log(INFO);
    }

    setHomeBtnEvent(){
        const BTN = document.getElementById("headerHomeBtn");
        BTN.addEventListener("click",()=>{
            const RAW_SPAN_TEXT = document.getElementById("headerUserName").textContent;
            this.uploadLoginDataBySpan(RAW_SPAN_TEXT);//○○さん　ようこそ　という形式のSPANタグテキスト
            window.location.href = this.HtmlFunction.returnHomePageURL();
        });
    }

    async transitioningHP_IfInvalid(){
        const IS_COOKIE_VALID = await this.__isCookieValid();
        if(IS_COOKIE_VALID){
            //pass
            console.log(`is valid : ${IS_COOKIE_VALID}`);
        }else{
            window.location.href = this.HtmlFunction.returnHomePageURL();
            console.log(`is invalid : ${IS_COOKIE_VALID}`);
        }
    }
    __isInSetting(){
        const SETTING_URL = this.HtmlFunction.composeURLbyPageTitle("setting");
        if(window.location.href == SETTING_URL){
            return true;
        }else{
            return false;
        }
    }

    /**
     * @description 保存したクッキーが有効期限内か判定します。
     * 有効期限内であれば、trueではなくログイン中のユーザー名が返ります。
     * 有効期限外であれば、false
     */
    async __isCookieValid(){
        const LOGIN_DATA = await this.FirebaseApp.downloadExpiringCookie();
        const USER_NAME = LOGIN_DATA.user_name;
        return USER_NAME;
    }

    async applyLoginIfNotExpire(){
        const USER_NAME =  await this.__isCookieValid();

        if(USER_NAME){
            const URL = window.location.href;
            //有効期限付きデータにログインしたユーザー名があるときはログイン
            this.__displayUserName(USER_NAME);

            if(URL == this.HtmlFunction.returnHomePageURL()){//HPならば
                this.__changeLoginBtnDisplay();

                //ユーザー設定が反映される前にdoButtonEventが実行されていた。
                //そのため、awaitで完全に反映させてから行うことにした。　
                await this.__applyUserSetting(USER_NAME);

                this.__doButtonEvent();
            }else if(URL == this.HtmlFunction.composeURLbyPageTitle("setting")){//設定ページならば
                this.__setSearchDateOption();
                this.__setCellsValue();
            }
            this.isLogin = true;
        }
    }

    __displayUserName(USER_NAME){
        const HEADER_USER_NAME = document.getElementById("headerUserName");
        HEADER_USER_NAME.style.display = "block";
        HEADER_USER_NAME.textContent = `${USER_NAME}さん　ようこそ`;
    }
    __hideUserName(){
        const HEADER_USER_NAME = document.getElementById("headerUserName");
        HEADER_USER_NAME.style.display = "none";
        HEADER_USER_NAME.textContent = "";
    }
    __extractUserNameBySpan(){
        const SPAN_TEXT = document.getElementById("headerUserName").textContent;
        const USER_NAME = SPAN_TEXT.replace("さん　ようこそ","");
        return USER_NAME;
    }

    __changeLoginBtnDisplay(){
        const LOGIN_BTN = document.getElementById("menuBtnLogin");
        const CURRENT_DISPLAY_LABEL = LOGIN_BTN.textContent;

        if(CURRENT_DISPLAY_LABEL=="ログイン"){
            LOGIN_BTN.textContent = "ログアウト";

        }else if(CURRENT_DISPLAY_LABEL == "ログアウト"){
            LOGIN_BTN.textContent = "ログイン";
        }
    }
    

    uploadLoginData(USER_NAME){
        const DATA = {"user_name" : USER_NAME}
        this.FirebaseApp.uploadExpiringCookie(DATA);
    }

    uploadLoginDataBySpan(SPAN_TEXT){
        const USER_NAME = SPAN_TEXT.replace("さん　ようこそ","");
        const DATA = {"user_name" : USER_NAME}
        this.FirebaseApp.uploadExpiringCookie(DATA);
    }

    //-----------------------------------------------------------------
    //[setting.html]
    setBtnsEvent(){
        const BTN_SEARCH_DATE = document.getElementById("btnSearchDate");
        const BTN_SEARCH_HASHTAGS = document.getElementById("btnSearcHashtags");

        BTN_SEARCH_DATE.addEventListener("click",()=>{
            this.__uploadSetting_SearchDate();
            this.__showFinishInfo("search_date");
        })

        BTN_SEARCH_HASHTAGS.addEventListener("click",()=>{
            this.__uploadSetting_Hashtag();
            this.__showFinishInfo("hashtags")
        })
    }

    __uploadSetting_SearchDate(){
        const COMBO_BOX = document.getElementById("combo");
        const RAW_COMBO_VALUE = COMBO_BOX.value;
        const SPLITED_DATA = RAW_COMBO_VALUE.split("|");
        //since~until|today => [since~until, today]
        //since~until|custom =>[since~until, custom]
        const DURATION = SPLITED_DATA[0]; // today, week, month
        const OPTION = SPLITED_DATA[1]; //  since~until/ ~until

        var since = "";
        var until = "";

        const NOW = new Date();
        const TODAY =new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());

        if(DURATION== "all"){
            since = "";
            until =  this.__composeFormatedDate(TODAY);
            //toISOString() → "2025-02-02T00:00:00.000Z" のようなISOフォーマットを取得
            //.split('T')[0] → "2025-02-02" の部分だけを取得
        
        }else if(DURATION == "today"){
            since = this.__composeFormatedDate(TODAY);

            var nextDay = new Date();
            nextDay.setDate(nextDay.getDate()+1);
            until = this.__composeFormatedDate(nextDay);
        
        }else if(DURATION == "week"){
            since = this.__composeFormatedDate(TODAY);

            var week = new Date();
            week.setDate(week.getDate()+7);
            until = this.__composeFormatedDate(week);
        
        }else if(DURATION == "month"){
            since = this.__composeFormatedDate(TODAY);

            var month = new Date();
            month.setMonth(month.getMonth() + 1);
            if(month.getDate() !== TODAY.getDate()){
                month.setDate(0);//月末
            }
            until = this.__composeFormatedDate(month);

        }else if(DURATION == "custom"){
            since = this.SINCE_DATE.value;
            until = this.UNTIL_DATE.value;
        }

        const DICT_OPTIONS = {
            "since" : since,
            "until" : until,
            "option": OPTION,
            "duration":DURATION
        }


        const USER_NAME = this.__extractUserNameBySpan();
        this.FirebaseApp.uploadData(`data/users/${USER_NAME}/SearchOption`,DICT_OPTIONS)
    }

    __composeFormatedDate(DATE){
        const FORMATED_DATE = DATE.toLocaleDateString('ja-JP', {  
            timeZone: 'Asia/Tokyo',  
            year: 'numeric',  
            month: '2-digit',  
            day: '2-digit'  
        }).replace(/\//g, '-');

        return FORMATED_DATE;
    }

    setComboboxEvent(){
        const COMBO_BOX = document.getElementById("combo");
        COMBO_BOX.addEventListener("change",()=>{
            if(COMBO_BOX.value=="custom|since~until"){
                this.__Combobox__showCustomElems();
            }else{
                this.__Combobox__hideCustomElems();
            }
        })
    }

    __Combobox__showCustomElems(){
        const CUSTOM_ELEM = document.getElementById("comboCustom");
        CUSTOM_ELEM.style.display = "block";
    }
    __Combobox__hideCustomElems(){
        const CUSTOM_ELEM = document.getElementById("comboCustom");
        CUSTOM_ELEM.style.display = "none";
    }

    async __setSearchDateOption(){
        const USER_NAME = this.__extractUserNameBySpan()
        console.log(USER_NAME);
        const USER_SEARCH_OPTION = await this.FirebaseApp.downloadData(`data/users/${USER_NAME}/SearchOption`);
        console.log(USER_SEARCH_OPTION);

        const COMBO_BOX = document.getElementById("combo");
        if(USER_SEARCH_OPTION.duration == "all"){
            COMBO_BOX.value = "all|all";
        
        }else if(USER_SEARCH_OPTION.duration == "today"){
            COMBO_BOX.value = "today|since~until";

        }else if(USER_SEARCH_OPTION.duration == "week"){
            COMBO_BOX.value = "week|since~until";

        }else if(USER_SEARCH_OPTION.duration == "month"){
            COMBO_BOX.value = "month|since~until";

        }else if(USER_SEARCH_OPTION.duration == "custom"){
            COMBO_BOX.value = "custom|since~until";
            this.__Combobox__showCustomElems();
            this.__setRadioExtraElemsDate(USER_SEARCH_OPTION.since,USER_SEARCH_OPTION.until);
        }
    }

    async __showFinishInfo(SETTING_CONTENT){
        const SETTING_INFO = document.getElementById("setting-info");
        SETTING_INFO.style.display = "none";
        
        await new Promise(resolve => setTimeout(resolve, 1000));

        if(      SETTING_CONTENT=="search_date"){
            SETTING_INFO.textContent = "✅日程範囲を更新しました"
            SETTING_INFO.style.display = "block";
        }else if(SETTING_CONTENT == "hashtags"){
            SETTING_INFO.textContent = "✅ハッシュタグを更新しました"
            SETTING_INFO.style.display = "block";
        }else{
            alert("存在しない設定です。in __showFinishInfo")
        }
    }

    __uploadSetting_Hashtag(){
        var hashtag_data = [];
        for(let cnt=1; cnt<5; cnt++){
            var cell = document.getElementById(`hashtag${cnt}Title`);
            hashtag_data.push(cell.textContent);
            console.log(cnt),
            console.table(hashtag_data);
        }

        const USER_NAME = this.__extractUserNameBySpan();
        this.FirebaseApp.uploadData(`data/users/${USER_NAME}/Hashtags`,hashtag_data);
    }

    async __setCellsValue(){
        const USER_NAME = this.__extractUserNameBySpan();
        var HASHTAG_DATA = [""];
        HASHTAG_DATA = await this.FirebaseApp.downloadData(`data/users/${USER_NAME}/Hashtags`);
        console.table(HASHTAG_DATA);

        let cnt = 1;
        for(const HASHTAG of HASHTAG_DATA){
            var cell = document.getElementById(`hashtag${cnt}Title`);
            cell.textContent = HASHTAG;
            cnt += 1;
        }
    }

    //-----------------------------------------------------------------
    //[login.html]
    setLoginEvent(){
        const INPUT_USER_NAME = document.getElementById("userName");
        const BTN_LOGIN = document.getElementById("btnLogin");
        


        BTN_LOGIN.addEventListener("click", async ()=>{
            const USER_NAME = INPUT_USER_NAME.value;
            const LOGIN_DATA =  await this.FirebaseApp.downloadData(`data/users/${USER_NAME}`);
            if(LOGIN_DATA){
                //pass
            }else{
                this.__signUpUser(USER_NAME);
            }

            this.uploadLoginData(USER_NAME);
            
            var isGoingSettingDatas= await this.FirebaseApp.downloadData("data/isGoingSetting")
            const IS_GOING_SETTING =isGoingSettingDatas.boolean; 

            if(IS_GOING_SETTING){
                isGoingSettingDatas = {
                                        "boolean": true,
                                      };
                this.FirebaseApp.uploadData("data/isGoingSetting",IS_GOING_SETTING);
              
                window.location.href = this.HtmlFunction.composeURLbyPageTitle("setting");

            }else{

                window.location.href = this.HtmlFunction.returnHomePageURL();      
            }

                  
        })

    }

    __signUpUser(USER_NAME){
        this.FirebaseApp.uploadData(`data/users/${USER_NAME}`,{});

    }



    //--------------------------------------------------------------------------
    //[index.html]
    async setLastUsedOption(){
        const DATA = await this.FirebaseApp.downloadData("local_data");
        this.SINCE_DATE.value = DATA["since"];
        this.UNTIL_DATE.value = DATA["until"];
        
        const OPTION = DATA["option"];
        this.__selectRadioButton(OPTION);

        this.__hideRadioExtraElems();
        this.__showRadioExtraElem(OPTION);

        this.__doButtonEvent();

    }
    __selectRadioButton(OPTION){
        var radioButton = "";

        if(      OPTION == "all"){
            radioButton = document.getElementById("radioAll");
            radioButton.checked = true;
        }else if(OPTION == "since~"){
            radioButton = document.getElementById("radioSince");
            radioButton.checked = true;
        }else if(OPTION == "~until"){
            radioButton = document.getElementById("radioUntil");
            radioButton.checked = true;
        }else if(OPTION == "since~until"){
            radioButton = document.getElementById("radioSinceUntil");
            radioButton.checked = true;
        }else{
            //alert(`error:${OPTION}`)
        }
    }
    __hideRadioExtraElems(){
        this.INPUT_SINCE.style.display  = "none";
        this.SPAN_SINCE.style.display   = "none";

        this.INPUT_UNTIL.style.display  = "none";
        this.SPAN_UNTIL.style.display   = "none";

    }
    __showRadioExtraElem(option){
        if(      option == "since~"){
            this.INPUT_SINCE.style.display  = "inline";
            this.SPAN_SINCE.style.display   = "inline";

        }else if(option == "~until"){
            this.INPUT_UNTIL.style.display  = "inline";
            this.SPAN_UNTIL.style.display   = "inline";   

        }else if(option=="since~until"){
            this.INPUT_SINCE.style.display  = "inline";
            this.SPAN_SINCE.style.display   = "inline";

            this.INPUT_UNTIL.style.display  = "inline";
            this.SPAN_UNTIL.style.display   = "inline";

        }
    }

    __setRadioExtraElemsDate(SINCE,UNTIL){
        this.INPUT_SINCE.value = SINCE;
        this.INPUT_UNTIL.value = UNTIL;
    }

    __composeLinks(){
        const OPTION        = document.querySelector('input[name="option"]:checked').value;
        const TABEL_ROW_LEN = document.querySelectorAll("tr").length;

        if(      OPTION == "all"){
            for(let i = 1; i< TABEL_ROW_LEN; i++){
            
                var HASHTAG    = document.getElementById(`hashtag${i}Title`).textContent;
                HASHTAG        = HASHTAG.replace("#","%23");
                
                var LINK_CELL         = document.getElementById(`hashtag${i}LINK`);
                LINK_CELL.href        = `https://x.com/search?q=(${HASHTAG})&src=typed_query&f=live`;
                LINK_CELL.textContent = `https://x.com/search?q=(${HASHTAG})&src=typed_query&f=live`;
            }

        }else if(OPTION == "since~"){
            const SINCE_VALUE = this.SINCE_DATE.value;

            for(let i = 1; i< TABEL_ROW_LEN; i++){
            
                var HASHTAG    = document.getElementById(`hashtag${i}Title`).textContent;
                HASHTAG        = HASHTAG.replace("#","%23");

                var LINK_CELL         = document.getElementById(`hashtag${i}LINK`);
                LINK_CELL.href        = `https://x.com/search?f=live&q=(${HASHTAG})%20since%3A${SINCE_VALUE}&src=typed_query&f=live`;
                LINK_CELL.textContent = `https://x.com/search?f=live&q=(${HASHTAG})%20since%3A${SINCE_VALUE}&src=typed_query&f=live`;
            }

        }else if(OPTION == "~until"){
            const UNTIL_VALUE = this.UNTIL_DATE.value;
            for(let i = 1; i< TABEL_ROW_LEN; i++){
            
                var HASHTAG    = document.getElementById(`hashtag${i}Title`).textContent;
                HASHTAG        = HASHTAG.replace("#","%23");

                var LINK_CELL         = document.getElementById(`hashtag${i}LINK`);
                LINK_CELL.href        = `https://x.com/search?f=live&q=(${HASHTAG})%20until%3A${UNTIL_VALUE}&src=typed_query&f=live`;
                LINK_CELL.textContent = `https://x.com/search?f=live&q=(${HASHTAG})%20until%3A${UNTIL_VALUE}&src=typed_query&f=live`;
            }

        }else if(OPTION == "since~until"){
            const SINCE_VALUE = this.SINCE_DATE.value;
            const UNTIL_VALUE = this.UNTIL_DATE.value;
          
            for(let i = 1; i< TABEL_ROW_LEN; i++){
            
                var HASHTAG    = document.getElementById(`hashtag${i}Title`).textContent;
                HASHTAG        = HASHTAG.replace("#","%23");
                console.log(HASHTAG);

                var LINK_CELL         = document.getElementById(`hashtag${i}LINK`);
                LINK_CELL.href        = `https://x.com/search?f=live&q=(${HASHTAG})%20until%3A${UNTIL_VALUE}%20since%3A${SINCE_VALUE}&src=typed_query&f=live`;
                LINK_CELL.textContent = `https://x.com/search?f=live&q=(${HASHTAG})%20until%3A${UNTIL_VALUE}%20since%3A${SINCE_VALUE}&src=typed_query&f=live`;
            }
        }else{
            alert(`error:${OPTION}`)
        }
    }
    __uploadLastUsedOption(){
        const OPTION        = document.querySelector('input[name="option"]:checked').value;
        const DICT_OPTIONS = {
                                "since" : this.SINCE_DATE.value,
                                "until" : this.UNTIL_DATE.value,
                                "option": OPTION
                             }
        this.FirebaseApp.uploadData("local_data",DICT_OPTIONS)
    }


    setRadioEvent(){
        const RADIO_BUTTONS = document.querySelectorAll('input[name="option"]');
        for(let radio of RADIO_BUTTONS){
     
            radio.addEventListener("change",()=>{

                this.__hideRadioExtraElems();
                const OPTION = radio.value;
                this.__showRadioExtraElem(OPTION);

                this.__resetA_Color();
            })
        }

    }
    __resetA_Color(){
        const A_TAGS = document.querySelectorAll("a");
        for(let aTag of A_TAGS){
          
            aTag.style.color = "rgb(0, 0, 238)";//aタグを初期状態に戻す
        }
    }


    setButtonEvent(){
        this.BUTTON_ENTER.addEventListener("click",()=>{
            this.__doButtonEvent();
        })
    }
    __doButtonEvent(){
        this.__composeLinks();
        this.__resetA_Color();

        this.__uploadLastUsedOption();
    }

    setA_Event(){
        const A_TAGS = document.querySelectorAll("a");
        for(let aTag of A_TAGS){
            aTag.addEventListener("click",(event)=>{
                event.target.style.color = "rgb(100, 46, 150)" //リンククリック後の色。
            })
        }
    }

    setMenuEvent(){
        const BTN = document.getElementById("headerSettingBtn");
        const MENU = document.getElementById("menu");
        BTN.addEventListener("click",()=>{
            MENU.style.display = "inline";
        })

        BTN.addEventListener("mouseenter",()=>{
            MENU.style.display = "inline";
        })

        BTN.addEventListener("mouseleave", () => {
            MENU.style.display = "none";
        });

        MENU.addEventListener("mouseenter",()=>{
            MENU.style.display = "inline";
        })

        MENU.addEventListener("mouseleave",()=>{
            MENU.style.display = "none";
        })
    }

    setMenuBtnsEvent(){
        const BTN_LOGIN =  document.getElementById("menuBtnLogin");
        const BTN_SETTING = document.getElementById("menuBtnSetting");

        BTN_LOGIN.addEventListener("click",(event)=>{
            this.__setBtnLoginEvent(event.target);            
        })

        BTN_SETTING.addEventListener("click",(event)=>{
            this.__setBtnSettingEvent();
        })
    }

    __setBtnLoginEvent(BTN_LOGIN){
        if(this.isLogin){
            //ログアウト処理
            this.setLastUsedOption();
            //ログアウトしたら、前回誰か（世界中の）が使った設定を反映する
            this.__changeLoginBtnDisplay();
            //ログアウトしたら、ボタンをログインに　ラベルを書き換える。
            this.__hideUserName();
            this.isLogin = false;
        }else{
            //ログイン処理のために　ログイン画面へ遷移
            const DATA = {"empty":""}
            this.FirebaseApp.uploadExpiringCookie(DATA);
            window.location.href = this.HtmlFunction.composeURLbyPageTitle("login");
        }
    }
    __setBtnSettingEvent(BTN_SETTING){
        if(this.isLogin){
            const RAW_SPAN_TEXT = document.getElementById("headerUserName").textContent;
            this.uploadLoginDataBySpan(RAW_SPAN_TEXT);
            window.location.href = this.HtmlFunction.composeURLbyPageTitle("setting");
        }else{
            const IS_GOING_SETTING_DATAS = {
                                            "boolean":true
                                            };
            this.FirebaseApp.uploadData("data/isGoingSetting",IS_GOING_SETTING_DATAS);
            window.location.href = this.HtmlFunction.composeURLbyPageTitle("login");
        }
        
    }

    __setHastags(HASHTAG_DATA){
       
        for(var cnt = 1; cnt < 5; cnt++){
            var cell = document.getElementById(`hashtag${cnt}Title`);
            cell.textContent = `#${HASHTAG_DATA[cnt-1]}`;
        }
    }
   
    async __applyUserSetting(USER_NAME){
        const USER_SEARCH_OPTION = await this.FirebaseApp.downloadData(`data/users/${USER_NAME}/SearchOption`);
        const USER_HASHTAG_OPTION = "";//TODO : HASHTAGの設定を実装したら追加する   
        console.log(USER_SEARCH_OPTION);

        this.__selectRadioButton(USER_SEARCH_OPTION.option);    
        this.__setRadioExtraElemsDate(USER_SEARCH_OPTION.since,USER_SEARCH_OPTION.until);    

        var hashtagData = [];
        hashtagData = await this.FirebaseApp.downloadData(`data/users/${USER_NAME}/Hashtags`);
        this.__setHastags(hashtagData);
    }
}


const App = new Application();