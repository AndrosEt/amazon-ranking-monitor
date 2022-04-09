<template>
  <div class="asin-container">
    <div class="header-container">
      <el-button
          type="primary"
          @click="handleAdd()">新增asin
      </el-button>
    </div>
    <el-table
        v-loading="asinTableLoading"
        :data="asinList"
        style="width: 100%">
      <el-table-column
          prop="asin"
          label="asin"
          width="180">
      </el-table-column>
      <el-table-column
          prop="count"
          label="关键词个数"
          width="180">
      </el-table-column>
      <el-table-column
          label="关键词"
          width="280">
        <template slot-scope="scope">
          <div slot="reference" class="keyword-wrapper">
            <el-tag size="medium" v-for="(item, index) in scope.row.keywords" style="margin-right: 3px; cursor: pointer"
                    :key="item.keyword"
                    @click="handleKeywordRanking(scope.$index, index)"
                    >{{ item.keyword }}{{item.ranking.length > 0? ':' + item.ranking[item.ranking.length - 1].page + '-' + item.ranking[item.ranking.length - 1].index: ''}}</el-tag>
          </div>
        </template>
      </el-table-column>
<!--      <el-table-column label="操作">-->
<!--        <template slot-scope="scope">-->
<!--          <el-button-->
<!--              size="mini"-->
<!--              @click="handleView(scope.$index, scope.row)">查看-->
<!--          </el-button>-->
<!--        </template>-->
<!--      </el-table-column>-->
    </el-table>
    <el-dialog
        title="提示"
        :visible.sync="asinDialogVisible"
        width="80%">
      <el-form :model="asinDetailForm" ref="asinDetailForm" label-width="100px" class="demo-dynamic">
        <el-form-item
            prop="asin"
            label="asin"
            :rules="{
              required: true, message: 'asin不能为空', trigger: 'blur'
            }"
        >
          <el-input v-model="asinDetailForm.asin"></el-input>
        </el-form-item>
        <el-form-item
            v-for="(keyword, index) in asinDetailForm.keywords"
            :label="'关键词' + (index + 1)"
            :key="keyword.key"
            :rules="{
              required: true, message: '关键词不能为空', trigger: 'blur'
            }"
        >
          <el-input v-model="keyword.value"></el-input>
          <el-button @click.prevent="removeKeyword(index)">删除</el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitAsinForm('asinDetailForm')">提交</el-button>
          <el-button @click="addKeyword">新增keyword</el-button>
          <el-button @click="resetAsinForm('dynamicValidateForm')">重置</el-button>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="asinDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleAsinConfirm">确 定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {defaultItemLimit, geo} from "@/constant";
import AmazonScraper from "@/Amazon";

export default {
  name: 'Home',
  props: {
    msg: String
  },
  data() {
    return {
      asinList: [],
      asinTableLoading: false,
      asinDialogVisible: false,
      asinDetailForm: {
        asin: '',
        keywords: []
      },
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
    }
  },
  created() {
    this.getAsinFromDb()
    this.startTask()
  },
  mounted() {
    setInterval(this.getAsinFromDb, 1000* 60)

  },
  methods: {
    handleView(index, row) {
      this.$router.push({
        path: 'keyword',
        query: {asinIndex: index}
      })
    },
    handleAdd() {
      this.asinDialogVisible = true
    },
    handleAsinConfirm() {

    },
    removeKeyword(index) {
      this.asinDetailForm.keywords.splice(index,1)
    },
    submitAsinForm(formName) {
      this.$refs[formName].validate(async (valid) => {
        if (valid) {
          const data = {
            asin: this.asinDetailForm.asin,
            keywords: this.asinDetailForm.keywords.map(item => {
              return {
                keyword: item.value,
                ranking: []
              }
            })
          }
          await this.$dbOperation.dbOperation('add', data)
          this.$message.success('添加成功！')
          this.asinDialogVisible = false
          await this.getAsinFromDb()
        } else {
          this.$message.error('填写内容有错误！')
          return false;
        }
      });
    },
    addKeyword() {
      this.asinDetailForm.keywords.push({
        keyword: {
          value: ''
        },
        ranking: []
      })
    },
    resetAsinForm(formName) {
      this.$refs[formName].resetFields();
    },
    handleKeywordRanking(asinIndex, keywordIndex) {
      this.$router.push({
        path: 'keyword',
        query: {asinIndex, keywordIndex}
      })
    },
//********************************************************
    async getAsinFromDb() {
      const data = await this.$dbOperation.dbOperation('getAll')
      this.asinList = data.map(item => {
        return {
          asin: item.asin,
          count: item.keywords.length,
          keywords: item.keywords
        }
      })
    },
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
          await this.checkRanking(asin, i, j)
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

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
.asin-container {
  padding: 20px;

  .header-container {
    display: flex;
    flex-direction: row-reverse;
  }

}
</style>
