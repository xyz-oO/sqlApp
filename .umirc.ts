import { defineConfig } from "umi";

export default defineConfig({
  links: [{ rel: 'icon', href: '/logo.png' }],
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    { path: "/login", component: "index" },
    { path: "/user-manager", component: "user-manager" },
    { path: "/sql-manager", component: "sql-manager" },
    { path: "/:sessionId", component: "home" },
    { path: "/sql/:id", component: "sql/[id]" },
  ],
  
  npmClient: 'pnpm',
  proxy: {
    '/api': {
      target: 'http://localhost:5001',
      changeOrigin: true,
    },
  },
  request:{},
  plugins:[
    '@umijs/plugins/dist/request'
  ]

});
