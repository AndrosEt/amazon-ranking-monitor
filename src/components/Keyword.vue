<template>
  <div class="keywords-container">
    <el-switch
        v-model="isAd"
        @change="handleTypeChange"
        active-text="广告排位"
        inactive-text="自然排位">
    </el-switch>
    <div id="history-chart" class="history-chart"></div>
    <el-divider></el-divider>
    <el-pagination
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="currentPage"
        :page-sizes="[50, 100, 200, 1000]"
        :page-size="pageSize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total">
    </el-pagination>
    <br>
    <el-table
        v-loading="historyTableLoading"
        :data="rankingHistoryForTable"
        style="width: 90%">
      <el-table-column
          prop="page"
          label="page"
          width="100">
      </el-table-column>
      <el-table-column
          prop="index"
          label="位置"
          width="100">
      </el-table-column>
      <el-table-column
          prop="type"
          label="排名类型（广告/正常）"
          width="180">
      </el-table-column>
      <el-table-column
          prop="time"
          label="时间"
          :formatter="timeFormatter"
          width="180">
      </el-table-column>
    </el-table>
    <br>
    <el-pagination
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="currentPage"
        :page-sizes="[50, 100, 200, 1000]"
        :page-size="pageSize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total">
    </el-pagination>
  </div>
</template>

<script>
import * as echarts from 'echarts';
let _ = require('lodash');
export default {
  name: 'Home',
  props: {
    msg: String
  },
  data() {
    return {
      asinIndex: 0,
      keywordIndex: 0,
      asin:{},
      rankingHistoryForChart: [],
      rankingHistoryForTable: [],
      xData: [],
      yData: [],
      historyTableLoading: true,
      isAd: false,
      currentPage: 1,
      total: 0,
      pageSize: 50,
      myChart: undefined
    }
  },
  created() {
    this.asinIndex = this.$route.query.asinIndex
    this.keywordIndex = this.$route.query.keywordIndex

  },
  mounted() {
    // 基于准备好的dom，初始化echarts实例
    this.myChart = echarts.init(document.getElementById('history-chart'));

    this.getKeywordFromDb()
  },
  methods: {
    handleView(index, row) {

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
    initChart() {
      // 绘制图表
      this.myChart.setOption({
        title: {
          text: `${this.asin.asin} - ${this.asin.keywords[this.keywordIndex].keyword}`
        },
        tooltip: {},
        xAxis: {
          data: this.xData
        },
        yAxis: {},
        series: [
          {
            name: '排名',
            type: 'line',
            smooth: true,
            data: this.yData
          }
        ]
      });
    },
    handleTypeChange() {
      this.getKeywordFromDb()
    },
    async handleSizeChange(val) {
      this.pageSize = val
      await this.getKeywordFromDb()
    },
    async handleCurrentChange(val) {
      console.log(val)
      this.currentPage = val
      await this.getKeywordFromDb()
    },
    timeFormatter(row, column) {
      return new Date(row.time*1000).toLocaleString()
    },
//********************************************************
    async getKeywordFromDb() {
      const data = await this.$dbOperation.dbOperation('getAll')
      this.asin = data[this.asinIndex]
      this.rankingHistoryForChart = this.asin.keywords[this.keywordIndex].ranking.filter(item => this.isAd? item.type === 'ad' : item.type === 'normal')
      _.reverse(this.rankingHistoryForChart)
      this.total = this.rankingHistoryForChart.length
      this.rankingHistoryForTable = this.rankingHistoryForChart.splice((this.currentPage - 1) * this.pageSize, this.pageSize)
      this.xData = this.rankingHistoryForTable.map(item => {
        return new Date(item.time * 1000).toLocaleString()
      })
      this.yData = this.rankingHistoryForTable.map(item => {
        return ((item.page - 1) * 60) + item.index
      })
      this.initChart()
      this.historyTableLoading = false
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
.keywords-container {
  padding: 20px;
  .history-chart {
    width: 90%;
    height: 500px;
  }
}
</style>
