import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { useSessionStore, type TabKey } from '@/stores/useSessionStore'
import { useTeacherStore } from '@/stores/useTeacherStore'
import Activity1 from '@/views/student/Activity1.vue'
import Activity2 from '@/views/student/Activity2.vue'
import Activity3 from '@/views/student/Activity3.vue'
import Operator from '@/views/operator/index.vue'
import Login from '@/views/login/student.vue'
import TeacherLogin from '@/views/login/teacher.vue'
import TeacherLayout from '@/views/teacher/Layout.vue'
import TeacherDemo from '@/views/teacher/demo.vue'
import TeacherA3 from '@/views/teacher/Activity3.vue'
import TeacherWatch from '@/views/teacher/watch.vue'

const routes = [
  // 学生端
  { path: '/login', name: 'login', component: Login },
  { path: '/activity1', name: 'activity1', component: Activity1 },
  { path: '/activity2', name: 'activity2', component: Activity2 },
  { path: '/activity3', name: 'activity3', component: Activity3 },
  // 操作员端
  { path: '/operator', name: 'operator', component: Operator },
  // 教师端
  { path: '/login/teacher', name: 'login-teacher', component: TeacherLogin },
  {
    path: '/teacher',
    component: TeacherLayout,
    children: [
      { path: '', redirect: { name: 'teacher-demo' } },
      { path: 'demo', name: 'teacher-demo', component: TeacherDemo },
      { path: 'activity3', name: 'teacher-activity3', component: TeacherA3 },
      { path: 'watch', name: 'teacher-watch', component: TeacherWatch },
    ],
  },
  { path: '/', name: 'home', redirect: { name: 'login' } },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to: RouteLocationNormalized) => {
  const s = useSessionStore()
  const t = useTeacherStore()
  const isStu = to.path.startsWith('/activity') || to.name === 'login' || to.name === 'home'
  const isTea = to.path.startsWith('/teacher') || to.name === 'login-teacher' || String(to.name || '').startsWith('teacher-')
  const isOperator = to.name === 'operator'

  if (isStu) {
    const loggedIn = s.isLoggedIn()
    const name = to.name as TabKey | 'login' | 'home' | undefined
    if (!loggedIn && name !== 'login') return { name: 'login' }
    
    // 操作员不能访问活动页面
    if (loggedIn && s.persisted.role === 'operator' && name !== 'login') {
      return { name: 'operator' }
    }
    
    if (loggedIn && name === 'login') {
      // 根据角色跳转
      if (s.persisted.role === 'operator') {
        return { name: 'operator' }
      } else {
        return { name: s.persisted.currentTab }
      }
    }
    if (loggedIn && (name === 'home' || name === undefined)) return { name: s.persisted.currentTab }
  }

  if (isOperator) {
    const loggedIn = s.isLoggedIn()
    if (!loggedIn) return { name: 'login' }
    // 只有操作员角色才能访问操作员页面
    if (s.persisted.role !== 'operator') return { name: s.persisted.currentTab }
  }

  if (isTea) {
    const logged = t.isLoggedIn()
    if (!logged && to.name !== 'login-teacher') return { name: 'login-teacher' }
    if (logged && to.name === 'login-teacher') return { name: 'teacher-demo' }
  }
})

router.afterEach((to: RouteLocationNormalized) => {
  const store = useSessionStore()
  const tab = to.name as TabKey | undefined
  if (tab === 'activity1' || tab === 'activity2' || tab === 'activity3') {
    store.setTab(tab)
  }
})

export default router
