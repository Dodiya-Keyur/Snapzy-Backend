const ImageKit = require("@imagekit/nodejs");

// Initialize ImageKit client with environment private key
const imagekit = new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY
});

// Upload binary buffer to ImageKit cloud storage
async function uploadFile(buffer, mimetype) {
    // Extract file extension from mimetype
    const extension = mimetype.split("/")[1];

    // Upload base64 encoded buffer to ImageKit storage
    const result = await imagekit.files.upload({
        file: buffer.toString("base64"),
        fileName: `image-${Date.now()}.${extension}`,
    });

    return result;
}

module.exports = {
    imagekit,
    uploadFile
};