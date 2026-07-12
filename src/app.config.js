module.exports = ({ config }) => {
  return {
    ...config,
    expo: {
      ...config.expo,
      plugins: config.expo.plugins.map((plugin) => {
        if (Array.isArray(plugin) && plugin[0] === "@rnmapbox/maps") {
          return [
            "@rnmapbox/maps",
            { RNMapboxMapsDownloadToken: process.env.RNMAPBOX_DOWNLOAD_TOKEN },
          ];
        }
        return plugin;
      }),
    },
  };
};