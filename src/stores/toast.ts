import { defineStore } from 'pinia'

export const useToastStore = defineStore('toast', {
  state: () => ({
    visible: false,
    message: '',
    timer: null as ReturnType<typeof setTimeout> | null,
  }),
  actions: {
    show(msg: string, duration = 2000) {
      this.message = msg
      this.visible = true
      if (this.timer)
        clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        this.visible = false
      }, duration)
    },
  },
})
