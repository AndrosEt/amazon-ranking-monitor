<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>
import AmazonScraper from "./Amazon";
import {geo, defaultItemLimit} from "./constant";

export default {
  name: 'App',
  components: {
  },
  data() {
    return {
      INIT_OPTIONS: {
        bulk: true,
        number: defaultItemLimit,
        filetype: '',
        rating: [1, 5],
        page: 1,
        cookie: '',
        asyncTasks: 10,
        sponsored: false,
        category: 'aps',
        cli: false,
        sort: false,
        discount: false,
        reviewFilter: {
          // Sort by recent/top reviews
          sortBy: 'recent',
          // Show only reviews with verified purchase
          verifiedPurchaseOnly: false,
          // Show only reviews with specific rating or positive/critical
          filterByStar: '',
          formatType: 'all_formats',
        },
      },
      dbDataList: [],
      dbKeyList: []
    }
  },
  created() {
    // this.$dbOperation.dbOperation('add', {
    //   asin: "B00C625KVE",
    //   keywords: [
    //     {keyword: 'tool',
    //       ranking: [{index: 16, page: 2, type: 'ad', time: 165465634}, {
    //         index: 16,
    //         page: 2,
    //         type: 'normal',
    //         time: 165465634
    //       }]
    //     },
    //     {keyword: 'tool kit',
    //       ranking: [{index: 1, page: 1, type: 'ad', time: 165465634}, {
    //         index: 16,
    //         page: 2,
    //         type: 'normal',
    //         time: 165465634
    //       }]
    //     }
    //   ]
    // })
  },
  mounted() {
    // await this.checkRanking('B00C625KVE', 'tool')
    // this.startTask()
  },
  methods: {
    async startTask() {
      // get the asin and keyword list from indexDB
      this.dbDataList = await this.$dbOperation.dbOperation('getAll')
      this.dbKeyList = await this.$dbOperation.dbOperation('getAllKeys')
      console.log(this.dbDataList)
      await this.listLoop()

      // start the task
      // setInterval(this.listLoop, 1000* 60)
    },
    async listLoop() {
      for(let i = 0;i < this.dbDataList.length;i++) {
        const asin = this.dbDataList[i]
        let keywordList = this.dbDataList[i].keywords
        for(let j = 0;j < keywordList.length;j++) {
          // await this.checkRanking(asin, i, j)
          console.log(`i: ${i}, j: ${j}`)
        }
      }
    },
    async checkRanking(asin, i, j) {
      let options = {... this.INIT_OPTIONS}
      options.geo = geo[options.country] ? geo[options.country] : geo['US'];
      options.scrapeType = 'ranking';

      // options.filetype = 'csv'
      options.asyncPage = 5
      options.bulk = true
      options.asin = asin.asin
      options.keyword = asin.keywords[j].keyword
      const scraper = await new AmazonScraper(options);
      let data = await scraper.startScraper()
      console.log(`asin: ${asin.asin}, keyword: ${asin.keywords[j].keyword}`)
      const that = this
      setTimeout(function () {
        that.$nextTick(async () => {
          console.log(data)
          // update the record
          if (data.result.length > 0) {
            console.log('put for updating')
            let newRanking = data.result.map(item => {
              return {
                page: item.page,
                index: item.index,
                type: item.isAd ? 'ad' : 'normal',
                time: Number((new Date().getTime() / 1000).toFixed(0))
              }
            })
            asin.keywords[j].ranking.push(...newRanking)
            const sss = await that.$dbOperation.dbOperation('put', asin, that.dbKeyList[i])
            console.log(sss)
          }
        })
      }, 1000)
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
