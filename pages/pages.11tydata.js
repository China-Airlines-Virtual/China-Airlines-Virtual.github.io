module.exports = {
  eleventyComputed: {
    localeCode: (data) =>
      (data.pageLocale && data.pageLocale.code) || data.locale || "zh-TW",
    localeMeta: (data) =>
      data.site.locales.find((locale) => locale.code === data.localeCode),
    t: (data) => data.i18n[data.localeCode],
    languageHref: (data) => {
      const other = data.site.locales.find(
        (locale) => locale.code !== data.localeCode
      );
      return other ? other.href : "/";
    },
    flightHistoryHref: (data) => {
      if (data.localeCode !== "zh-TW" || !data.flightData.latest) {
        return false;
      }
      return `/flight-history-${data.flightData.latest.id}.html`;
    },
  },
};
