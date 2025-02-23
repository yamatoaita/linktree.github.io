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
        rawPath = `data/rawPath`;
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

        rawPath = `data/rawPath`;
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
        return PATH.replace(/(/?data/)+/, "data/");
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
// ----- utils.js END -----
