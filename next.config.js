module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.experiments = {
        ...config.experiments,
        topLevelAwait: true
      }
    }
    return config
  }
}
