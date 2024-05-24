const translationSchema = {
  originalText: { type: String, required: true },
  translatedText: { type: String, required: true },
  language: { type: String, required: true },
  userId: { type: ObjectId, required: true, ref: "User" },
};

module.exports = translationSchema;
