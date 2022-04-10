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
      <el-table-column label="操作">
        <template slot-scope="scope">
          <el-button
              size="mini"
              @click="handleEdit(scope.$index, scope.row)">编辑
          </el-button>
        </template>
      </el-table-column>
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
          <el-input v-model="asinDetailForm.asin" :disabled="selectEditAsinIndex !== undefined"></el-input>
        </el-form-item>
        <el-form-item
            v-for="(keyword, index) in asinDetailForm.keywords"
            :label="'关键词' + (index + 1)"
            :key="index"
            :rules="{
              required: true, message: '关键词不能为空', trigger: 'blur'
            }"
        >
          <el-input v-model="keyword.keyword"></el-input>
          <el-button @click.prevent="removeKeyword(index)">删除</el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitAsinForm('asinDetailForm')">提交</el-button>
          <el-button @click="addKeyword">新增keyword</el-button>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer" v-if="selectEditAsinIndex !== undefined">
        <el-button type="danger" @click="handleDeleteAsin">删除此 Asin</el-button>
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
      selectEditAsinIndex: undefined,
      selectEditAsin: undefined
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
    async handleDeleteAsin() {
      // await this.$dbOperation.dbOperation('delete',{}, this.dbKeyList[this.selectEditAsinIndex])

      this.$confirm('此操作将永久删除历史, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then( async () => {
        await this.$dbOperation.dbOperation('delete', {}, this.dbKeyList[this.selectEditAsinIndex])
        this.$message({
          type: 'success',
          message: '删除成功!'
        });
        this.asinDialogVisible = false
        this.resetAsinForm('asinDetailForm')
        await this.getAsinFromDb()
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消删除'
        });
      });
    },
    removeKeyword(index) {
      this.asinDetailForm.keywords.splice(index,1)
    },
    submitAsinForm(formName) {
      this.$refs[formName].validate(async (valid) => {
        if (valid) {
          if (this.selectEditAsinIndex !== undefined) {
            // edit
            let keywords = []
            // keep the old data
            this.selectEditAsin.keywords.forEach(selectedItem => {
              if (this.asinDetailForm.keywords.findIndex(item => { return item.keyword === selectedItem.keyword}) > -1) {
                keywords.push(selectedItem)
              }
            })
            // add new keyword
            this.asinDetailForm.keywords.forEach(formItem => {
              if (keywords.findIndex(item => {return item.keyword === formItem.keyword}) === -1) {
                keywords.push({
                  keyword: formItem.keyword,
                  ranking: []
                })
              }
            })
            const data = {
              asin: this.asinDetailForm.asin,
              keywords
            }
            await this.$dbOperation.dbOperation('put', data, this.dbKeyList[this.selectEditAsinIndex])
            this.$message.success('修改成功！')
            this.resetAsinForm('asinDetailForm')
            this.selectEditAsinIndex = undefined
          } else {
            // new
            const data = {
              asin: this.asinDetailForm.asin,
              keywords: this.asinDetailForm.keywords.map(item => {
                return {
                  keyword: item.keyword,
                  ranking: []
                }
              })
            }
            await this.$dbOperation.dbOperation('add', data)
            this.$message.success('添加成功！')
            this.resetAsinForm('asinDetailForm')
          }
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
        keyword: '',
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
    handleEdit(index, row) {
      this.asinDialogVisible = true
      this.selectEditAsin = row
      this.asinDetailForm = row
      this.selectEditAsinIndex = index
    },
//********************************************************
    async getAsinFromDb() {
      this.dbDataList = await this.$dbOperation.dbOperation('getAll')
      this.dbKeyList = await this.$dbOperation.dbOperation('getAllKeys')
      this.asinList = this.dbDataList.map(item => {
        return {
          asin: item.asin,
          count: item.keywords.length,
          keywords: item.keywords
        }
      })
    },
    async startTask() {

      // start the task
      setInterval(this.listLoop, 1000* 60 * 5)
    },
    async listLoop() {
      this.dbDataList = await this.$dbOperation.dbOperation('getAll')
      this.dbKeyList = await this.$dbOperation.dbOperation('getAllKeys')
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
      const that = this
      setTimeout(function () {
        that.$nextTick(async () => {
          // update the record
          if (data.result.length > 0) {
            let newRanking = data.result.map(item => {
              return {
                page: item.page,
                index: item.index,
                type: item.isAd ? 'ad' : 'normal',
                time: Number((new Date().getTime() / 1000).toFixed(0))
              }
            })
            asin.keywords[j].ranking.push(...newRanking)
            await that.$dbOperation.dbOperation('put', asin, that.dbKeyList[i])
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
