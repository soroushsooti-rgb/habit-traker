const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    proxy: {
      '/habit': {
        target: 'http://[::1]:8000',
        changeOrigin: true,
      },
      '/accounts': {
        target: 'http://[::1]:8000',
        changeOrigin: true,
      },
    },
  }
})
