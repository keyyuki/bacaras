function HahaInjection() {
    this.tableId = null;
    this.pools = []; // số liệu  từng round ở đây, bao gôm id, round, người thắng, cards, tiền đặt cược
    this.currentPool = null // pool hiện tại
    this.catMap = {
        '1': 'BANKER',
        '2': 'PLAYER',
        '3': 'TIE',
        '4': 'BANKER_PAIR',
        '5': 'PLAYER_PAIR',
        '6': 'BIG',
        '7': 'SMALL',
        '8': 'BANKER_N8',
        '9': 'PLAYER_N8',
        '10': 'BANKER_N9',
        '11': 'PLAYER_N9',
        '12': 'SUPER',
    }
    var that = this
    /**
    * {
           "roundid": 91014573,
           "shoe": 4,
           "round": 1,
           "result": "010001000000",
           "cards": "CKS6#D7D9D5"
       }
    * @param {object} trendPool 
    */
    this.analizeTrendPool =
         (trendPool) => {
            var winners = trendPool.result.split("").reduce((acc, cur, index) => {
                if (cur == '1') {
                    var n = this.catMap[(index + 1).toString()]
                    acc.push(n)
                }
                return acc;
            }, []);
            var cards = trendPool.cards.split("#")

            return Object.assign({}, trendPool, {
                table: this.tableId,
                winners: winners,
                playerCards: cards[0],
                bankerCards: cards[1]
            });
        }
    
    this.handleTrendMessage = (msg) => {
        this.tableId = msg.content.table
        this.pools = msg.content.value.map(item => this.analizeTrendPool(item));     
        // get last pool as currentPoll
        var currentPool = this.pools[this.pools.length -1]  ;
        this.currentPool = {
            table:  this.tableId,
            round: currentPool.round,
            roundid: currentPool.roundid,
            shoe:currentPool.shoe,
            cat: [],
            amount: [],
            volume: {}
        }
        window.localStorage.setItem('@table_' + this.tableId, JSON.stringify(this.pools)) 
    }
    
    this.handleStartBet = msg => {
        this.currentPool = {
            table:  msg.content.table,
            round: msg.content.round,
            roundid: msg.content.roundid,
            shoe: msg.content.shoe,
            cat: [],
            amount: [],
            volume: {}
        }
    }
    
    this.mapVolume = (cats, amounts) => {
        var result = {};
        for (let index = 0; index < cats.length; index++) {
            const catId = cats[index];
            const catKey = that.catMap[catId];
            result[catKey] = amounts[index]
        }
        return result;
    }
    
    this.handlePoolMessage = msg => {
        this.currentPool.cat = msg.content.cat;
        this.currentPool.amount = msg.content.amount;
        this.currentPool.volume = this.mapVolume(msg.content.cat, msg.content.amount)
    }
    
    this.handleCommitSucceed = (msg) => {
        var pool = this.analizeTrendPool(msg.content);
        pool = Object.assign(pool, {
            cat: this.currentPool.cat,
            amount: this.currentPool.amount,
            volume: this.currentPool.volume,
        });
        
        this.pools.push(pool);
        this.currentPool = null;
        window.localStorage.setItem('@table_' + this.tableId, JSON.stringify(this.pools))
    }
    /**
     * thứ tự khi vào room, trends
     * startbetsucceed (nhận đặt cược) -> [coundown 12->0 -> pool (nhiều, pool là số liệu cuối)] -> stopbetsucceed -> commitsucceed  
     */
    this.handleMessage = (evt) => {
        var msg = JSON.parse(evt.data);
        switch (msg.kind) {            
            case 'trends': // first come room, kết quả các round trước
            console.log('trends', msg)
                this.handleTrendMessage(msg);
                break;
            case 'startbetsucceed':
                
                console.log('startbetsucceed', msg)
                this.handleStartBet(msg);
                break;
            case 'pool': // số liệu đặt cửa
                this.handlePoolMessage(msg)
                break;
            case 'commitsucceed': // result khi kết thúc ván, cộng dồn vào trends
            
            if(msg.content.table == this.tableId) {
                console.log('commitsucceed', msg)
                 // push commit to trend
                 this.handleCommitSucceed(msg)
            }
               
                break;
            default:
                break;
        }
    },
    
    this.toCsv = () => {
        var data = window.localStorage.getItem('@table_' + this.tableId);
        if(data){
            data = JSON.parse(data);
        } else {
            data = [];
        }
        
        var csvData = [];
        csvData.push("table;round;roundId;winner;player cards;banker cards;BANKER;PLAYER;TIE;BANKER_PAIR;PLAYER_PAIR;BIG;SMALL;BANKER_N8;PLAYER_N8;BANKER_N9;PLAYER_N9;SUPER");
        data.forEach((item) => {
            var r = [];
            r.push(item.table)
            r.push(item.round)
            r.push(item.roundid)
            r.push(item.winners.join(", "))
            r.push(item.playerCards)
            r.push(item.bankerCards)
            
            var cats = Object.keys(this.catMap).map(key => this.catMap[key]);
            for (let index = 0; index < cats.length; index++) {
                const catName = cats[index];
                if(typeof item.volume !== 'undefined' && typeof item.volume[catName] !== 'undefined'){
                    r.push(item.volume[catName])
                } else {
                    r.push("")
                }
            }
            
            csvData.push(r.join(";"));
        })
        var displayBox = document.createElement('div')
        displayBox.style = "padding: 30px;"
        displayBox.innerHTML = csvData.join("<br/>");
        document.getElementsByTagName('body')[0].appendChild(displayBox)
    }
}
var myHahaInjection = new HahaInjection();
netutils.webSocket.onmessage = function (evt) { netutils.onMessage(evt); myHahaInjection.handleMessage(evt) }

