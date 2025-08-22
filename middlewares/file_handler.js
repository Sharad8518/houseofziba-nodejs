const AWS = require("aws-sdk");
const multer = require("multer");
const uniqid = require("uniqid");

//--->cred.
const ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const SECREST_ACCESS_KEY = process.env.AWS_SECREST_ACCESS_KEY;
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const BUCKET_REGION = process.env.AWS_REGION;

//<---cred.

// Configure AWS
AWS.config.update({
  accessKeyId: ACCESS_KEY,
  secretAccessKey: SECREST_ACCESS_KEY,
  region: BUCKET_REGION,
});

const s3 = new AWS.S3();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // no larger than 30mb
  },
});

// Utility function for uploading files to S3
const uploadFilesToS3 = async (files, folderName) => {
  return Promise.all(
    files.map(async (file) => {
      const extension = file.originalname.split(".").pop();
      const uniqueFileName = `${uniqid()}.${extension}`;
      const params = {
        Bucket: BUCKET_NAME,
        Key: `${folderName}/${uniqueFileName}`,
        Body: file.buffer,
        // ACL: "public-read", // make file publicly accessible
      };

      await s3.upload(params).promise();
      return {
        url: `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/${folderName}/${uniqueFileName}`,
        alt: file.originalname,
        kind: file.mimetype.startsWith("video") ? "video" : "image",
        bytes: file.size,
      };
    })
  );
};



// Utility function for deleting an image from S3
const deleteFileFromS3 = async (imageUrl) => {
  const fileName = imageUrl.split("/").pop();
  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
  };

  try {
    await s3.deleteObject(params).promise();
  } catch (error) {
    throw error;
  }
};

module.exports = { upload, uploadFilesToS3, deleteFileFromS3 };
