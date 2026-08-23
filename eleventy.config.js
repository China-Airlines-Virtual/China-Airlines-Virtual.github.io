module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("googleb88de4eb2fef16bf.html");
  eleventyConfig.addPassthroughCopy("inner-page.html");
  eleventyConfig.addPassthroughCopy("map-tool-internal-calva.html");

  eleventyConfig.addFilter("slashDate", (isoDate) => isoDate.replace(/-/g, "/"));

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: false,
  };
};
