// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
    "process.env": {},
    Buffer: "globalThis.Buffer"
  },
  optimizeDeps: {
    include: [
      "d3-array",
      "d3-scale",
      "d3-scale-chromatic",
      "d3-selection",
      "d3-time-format",
      "d3-zoom",
      "buffer"
    ]
  },
  resolve: {
    alias: {
      buffer: path.resolve(__vite_injected_original_dirname, "node_modules/buffer/index.js")
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICBkZWZpbmU6IHtcbiAgICBnbG9iYWw6ICdnbG9iYWxUaGlzJyxcbiAgICAncHJvY2Vzcy5lbnYnOiB7fSxcbiAgICBCdWZmZXI6ICdnbG9iYWxUaGlzLkJ1ZmZlcidcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogW1xuICAgICAgJ2QzLWFycmF5JyxcbiAgICAgICdkMy1zY2FsZScsXG4gICAgICAnZDMtc2NhbGUtY2hyb21hdGljJyxcbiAgICAgICdkMy1zZWxlY3Rpb24nLFxuICAgICAgJ2QzLXRpbWUtZm9ybWF0JyxcbiAgICAgICdkMy16b29tJyxcbiAgICAgICdidWZmZXInXG4gICAgXSxcbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBidWZmZXI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzJyksXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgICBob3N0OiB0cnVlXG4gIH0sXG59KSJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUZqQixJQUFNLG1DQUFtQztBQUl6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsUUFBUTtBQUFBLElBQ04sUUFBUTtBQUFBLElBQ1IsZUFBZSxDQUFDO0FBQUEsSUFDaEIsUUFBUTtBQUFBLEVBQ1Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLFFBQVEsS0FBSyxRQUFRLGtDQUFXLDhCQUE4QjtBQUFBLElBQ2hFO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
