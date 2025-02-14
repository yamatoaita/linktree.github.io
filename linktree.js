import {FirebaseFunctions} from '../utils/utils.js';

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

        this.INDEX_HTML = "index.html";
        this.LOGIN_HTML = "login.html";
        this.SETTING_HTML = "setting.html";

        const FIREBASE_CONFIG = {
            apiKey: "AIzaSyBYf6N1S-oMoHvJFGmLvlJ9t1WBsiSy2XQ",
            authDomain: "x-linktree.firebaseapp.com",
            databaseURL: "https://x-linktree-default-rtdb.firebaseio.com",
            projectId: "x-linktree",
            storageBucket: "x-linktree.firebasestorage.app",
            messagingSenderId: "207042084073",
            appId: "1:207042084073:web:e305b706b65b4d6e718478"
        };
        this.FIREBASE_APP = new FirebaseFunctions(FIREBASE_CONFIG);
        
        this.executeByURL();
    }
    //--------------------------------------------------------------------------
    //[common]
    executeByURL(){
        const URL = window.location.href;
        var page = URL.split("/").pop();
        page = page.replace(".html","");

        this.printFirebaseInfo();
        
        if(page == "linktree" || page == "index"){
            console.log("in execute By URL. bef all func");
            this.setLastUsedOption();

            console.log("fin set last used option");
            this.setRadioEvent();//ラジオボタンの選択状況に応じて、elementを表示させる
            console.log(" fin set radio event");
            this.setButtonEvent();//確定ボタンのイベントを設定
            console.log("fin set button event");
            this.setA_Event();//リンククリック時の色変化を設定
            console.log("fin set a event");
            this.setMenuEvent();
            console.log("fin set menu event");
            this.setMenuBtnsEvent();
            console.log("fin set menu btns event");

            this.applyLoginIfNotExpire();
            console.log("fin apply login if not expire")
        }else if(page == "login"){
            this.setLoginEvent();
            this.setHomeBtnEvent();

        }else if(page == "setting"){
            this.setComboboxEvent();
            this.setBtnsEvent();
            this.setHomeBtnEvent();

            this.applyLoginIfNotExpire();

         
        }
    }

    async printFirebaseInfo(){
        const INFO = await this.FIREBASE_APP.downloadData("data/info");
        console.log(INFO);
    }

    setHomeBtnEvent(){
        const BTN = document.getElementById("headerHomeBtn");
        BTN.addEventListener("click",()=>{
            const RAW_SPAN_TEXT = document.getElementById("headerUserName").textContent;
            this.uploadLoginDataBySpan(RAW_SPAN_TEXT);//○○さん　ようこそ　という形式のSPANタグテキスト
            window.location.href = this.INDEX_HTML;
        });
    }

    async applyLoginIfNotExpire(){
        var status = false;
        const LOGIN_DATA = await this.FIREBASE_APP.downloadExpiringCookie();
        const USER_NAME = LOGIN_DATA.user_name;

        if(USER_NAME){
            const URL = window.location.href;
            //有効期限付きデータにログインしたユーザー名があるときはログイン
            this.__displayUserName(USER_NAME);
            const FORMATED_URL = this.__formatURL(URL);
            console.log(FORMATED_URL)
            if(FORMATED_URL == this.INDEX_HTML){
                this.__changeLoginBtnDisplay();
                this.__applyUserSetting(USER_NAME);
            }else if(FORMATED_URL == this.SETTING_HTML){
                this.__setSearchDateOption();
            }
            this.isLogin = true;
        }
    }

    __formatURL(URL){
        //local環境の場合：http://127.0.0.1:5500/X_LinkTree/index.html
        const FORMATED_URL = URL.replace(/.*\//, '');
        return FORMATED_URL;
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
        this.FIREBASE_APP.uploadExpiringCookie(DATA);
    }

    uploadLoginDataBySpan(SPAN_TEXT){
        const USER_NAME = SPAN_TEXT.replace("さん　ようこそ","");
        const DATA = {"user_name" : USER_NAME}
        this.FIREBASE_APP.uploadExpiringCookie(DATA);
    }

    //-----------------------------------------------------------------
    //[setting.html]
    setBtnsEvent(){
        const BTN_SEARCH_DATE = document.getElementById("btnSearchDate");
        const BTN_SEARCH_HASHTAGS = document.getElementById("btnSearcHashtags");

        BTN_SEARCH_DATE.addEventListener("click",()=>{
            this.__updateSearchDate();
        })

        BTN_SEARCH_HASHTAGS.addEventListener("click",()=>{
            
        })
    }

    __updateSearchDate(){
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

        const RAW_SPAN_TEXT = document.getElementById("headerUserName").textContent;
        const USER_NAME = RAW_SPAN_TEXT.replace("さん　ようこそ","");
       
        this.FIREBASE_APP.uploadData(`data/users/${USER_NAME}/SearchOption`,DICT_OPTIONS)
        console.log(`data/users/${USER_NAME}/SearchOption  was sent`)
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
        const USER_SEARCH_OPTION = await this.FIREBASE_APP.downloadData(`data/users/${USER_NAME}/SearchOption`);
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

    //-----------------------------------------------------------------
    //[login.html]
    setLoginEvent(){
        const INPUT_USER_NAME = document.getElementById("userName");
        const BTN_LOGIN = document.getElementById("btnLogin");
        


        BTN_LOGIN.addEventListener("click", async ()=>{
            const USER_NAME = INPUT_USER_NAME.value;
            const LOGIN_DATA =  await this.FIREBASE_APP.downloadData(`data/users/${USER_NAME}`);
            if(LOGIN_DATA){
                //pass
            }else{
                this.__signUpUser(USER_NAME);
            }

            this.uploadLoginData(USER_NAME);
            
            var isGoingSettingDatas= await this.FIREBASE_APP.downloadData("data/isGoingSetting")
            const IS_GOING_SETTING =isGoingSettingDatas.boolean; 

            if(IS_GOING_SETTING){
                isGoingSettingDatas = {
                                        "boolean": true,
                                      };
                this.FIREBASE_APP.uploadData("data/isGoingSetting",IS_GOING_SETTING);
                window.location.href = this.SETTING_HTML;

            }else{
                window.location.href = this.INDEX_HTML;      
            }

                  
        })

    }

    __signUpUser(USER_NAME){
        this.FIREBASE_APP.uploadData(`data/users/${USER_NAME}`,{});

    }



    //--------------------------------------------------------------------------
    //[index.html]
    async setLastUsedOption(){
        const DATA = await this.FIREBASE_APP.downloadData("local_data");

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
            alert(`error:${OPTION}`)
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
        this.FIREBASE_APP.uploadData("local_data",DICT_OPTIONS)
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
            this.FIREBASE_APP.uploadExpiringCookie(DATA);
            window.location.href = this.LOGIN_HTML;
        }
    }
    __setBtnSettingEvent(BTN_SETTING){
        if(this.isLogin){
            const RAW_SPAN_TEXT = document.getElementById("headerUserName").textContent;
            this.uploadLoginDataBySpan(RAW_SPAN_TEXT);
            window.location.href = this.SETTING_HTML;
        }else{
            const IS_GOING_SETTING_DATAS = {
                                            "boolean":true
                                            };
            this.FIREBASE_APP.uploadData("data/isGoingSetting",IS_GOING_SETTING_DATAS);
            window.location.href = this.LOGIN_HTML;
        }
        
    }

   
    async __applyUserSetting(USER_NAME){
        const USER_SEARCH_OPTION = await this.FIREBASE_APP.downloadData(`data/users/${USER_NAME}/SearchOption`);
        const USER_HASHTAG_OPTION = "";//TODO : HASHTAGの設定を実装したら追加する   
        console.log(USER_SEARCH_OPTION);

        this.__selectRadioButton(USER_SEARCH_OPTION.option);    
        this.__setRadioExtraElemsDate(USER_SEARCH_OPTION.since,USER_SEARCH_OPTION.until);    
    }
}


const App = new Application();