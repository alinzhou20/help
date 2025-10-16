import { defineStore } from 'pinia'
import { subscribe, type RealtimeEvent } from '@/utils/realtime'

export interface GroupStars { a1: number; a2: number; a3: number; total: number }
export interface GroupData {
  stars: GroupStars
  records: { a1?: any; a2?: any; a3?: any }
}

function emptyStars(): GroupStars { return { a1: 0, a2: 0, a3: 0, total: 0 } }

export const useTeacherDataStore = defineStore('teacher-data', {
  state: () => ({
    groups: Array.from({ length: 13 }, (_, i) => i + 1),
    dataByGroup: {} as Record<string, GroupData>,
    onlineGroups: [] as number[],
    unsub: null as null | (() => void),
  }),
  actions: {
    ensure(gid: number) {
      const k = String(gid)
      if (!this.dataByGroup[k]) {
        this.dataByGroup[k] = { stars: emptyStars(), records: {} }
      }
      return this.dataByGroup[k]
    },
    apply(evt: RealtimeEvent) {
      if (evt.type === 'session:login') {
        // 所有角色的登录都要处理，以便在看板上显示在线状态
        if (!this.onlineGroups.includes(evt.groupId)) {
          this.onlineGroups.push(evt.groupId)
        }
        
        // 但只有记录员登录才创建数据结构（因为只有记录员会发送数据）
        if (evt.role === 'recorder' || !evt.role) {
          const k = String(evt.groupId)
          if (!this.dataByGroup[k]) {
            this.dataByGroup[k] = { stars: emptyStars(), records: {} }
          }
        }
        return
      }
      if (evt.type === 'session:logout') {
        // 所有角色的退出都要处理，更新在线组列表
        this.onlineGroups = this.onlineGroups.filter(g => g !== evt.groupId)
        
        // 注意：不再清空退出小组的星数和记录数据
        // 学生端刷新页面、网络断开等情况不应该导致数据丢失
        // 数据应该持久化保存，直到教师手动清除或课程结束
        return
      }
      if (evt.type === 'student:update') {
        // 确保有数据结构（student:update只能来自记录员）
        const g = this.ensure(evt.groupId)
        g.records[evt.activity] = evt.payload
        const s = g.stars
        if (evt.activity === 'a1') s.a1 = evt.stars
        if (evt.activity === 'a2') s.a2 = evt.stars
        if (evt.activity === 'a3') s.a3 = evt.stars
        s.total = s.a1 + s.a2 + s.a3
        // 触发响应式更新，确保图表立即刷新
        this.dataByGroup = { ...this.dataByGroup }
      }
    },
    start() {
      if (this.unsub) return
      this.unsub = subscribe((e) => this.apply(e))
    },
    stop() {
      if (this.unsub) { this.unsub(); this.unsub = null }
    }
  }
})
