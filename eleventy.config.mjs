// Eleventy v3, ESM. The whole toolchain: data files stay plain JS, the shell is
// shared once, and the list is rendered statically so the page is readable
// before Leaflet loads.
//
// pathPrefix MUST match the GitHub Pages subpath, i.e. the repository name, so
// that https://<user>.github.io/<repo>/ resolves every asset and fetch. Override
// it with PATH_PREFIX at build time if the repo is named something other than
// "roadtrip26". A single leading slash without this prefix works locally and
// 404s in production, so it is set once here and applied with the `url` filter
// on every link.
const PATH_PREFIX = process.env.PATH_PREFIX || "/roadtrip26/";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Nunjucks `dump` gives us JSON.stringify for the emitted per-page JSON.
  return {
    pathPrefix: PATH_PREFIX,
    dir: {
      input: "src",
      includes: "_includes",
      data: "../_data",
      output: "_site"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
