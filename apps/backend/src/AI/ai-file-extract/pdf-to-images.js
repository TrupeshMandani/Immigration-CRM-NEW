const { fromPath } = require("pdf2pic");

async function pdfToImages(pdfPath) {
  try {
    console.log("🔄 Converting PDF to images:", pdfPath);

    const convert = fromPath(pdfPath, {
      density: 150,
      saveFilename: "page",
      savePath: "./temp",
      format: "png",
      width: 2000,
      height: 2000,
    });

    // Convert all pages
    const results = await convert.bulk(-1, { responseType: "base64" });

    console.log(`✅ Converted ${results.length} pages to images`);

    // Return base64 data URLs for GPT vision input
    return results.map((result) => `data:image/png;base64,${result.base64}`);
  } catch (error) {
    console.error("❌ PDF to images conversion error:", error);
    // Fallback: return empty array if conversion fails
    return [];
  }
}

module.exports = { pdfToImages };
