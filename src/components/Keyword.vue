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
    <el-table
        v-loading="historyTableLoading"
        :data="rankingHistory"
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
  </div>
</template>

<script>
import * as echarts from 'echarts';
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
      rankingHistory: [],
      xData: [],
      yData: [],
      historyTableLoading: true,
      isAd: false
    }
  },
  created() {
    this.asinIndex = this.$route.query.asinIndex
    this.keywordIndex = this.$route.query.keywordIndex

  },
  mounted() {
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
      // 基于准备好的dom，初始化echarts实例
      let myChart = echarts.init(document.getElementById('history-chart'));
      // 绘制图表
      myChart.setOption({
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
    timeFormatter(row, column) {
      return new Date(row.time*1000).toLocaleString()
    },
//********************************************************
    async getKeywordFromDb() {
      const data = await this.$dbOperation.dbOperation('getAll')
      this.asin = data[this.asinIndex]
      this.rankingHistory = this.asin.keywords[this.keywordIndex].ranking.filter(item => this.isAd? item.type === 'ad' : item.type === 'normal')
      console.log(this.asin)
      this.xData = this.rankingHistory.map(item => {
        return new Date(item.time * 1000).toLocaleString()
      })
      this.yData = this.rankingHistory.map(item => {
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
