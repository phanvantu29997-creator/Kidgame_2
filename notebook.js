/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* Markdown (render)
# Image Generation & Editing with Gemini

This interactive notebook shows how to generate and iteratively edit images with **`gemini-2.5-flash-image`** using the `@google/genai` JS/TS SDK.

Run each cell in order using the play button on the left (or **Runtime -> Run All**).
*/

/* Markdown (render)
## 1. Initialize the SDK

Load `@google/genai` and configure the `gemini-2.5-flash-image` model on `persistentScope`.
*/

// [CODE STARTS]
const { GoogleGenAI, Modality } = await import('@google/genai');

const apiKey =
  (typeof process !== 'undefined' &&
    (process.env?.GEMINI_API_KEY || process.env?.API_KEY)) ||
  '';

persistentScope.ai = new GoogleGenAI({ apiKey });
persistentScope.Modality = Modality;
persistentScope.IMAGE_MODEL = 'gemini-2.5-flash-image';
console.log('Ready to generate images with:', persistentScope.IMAGE_MODEL);
// [CODE ENDS]

/* Markdown (render)
## 2. Generate an Image + Story Caption

Request both `TEXT` and `IMAGE` modalities and render the returned inline image directly in the cell output using `console.image(...)`.
*/

// [CODE STARTS]
const genResponse = await persistentScope.ai.models.generateContent({
  model: persistentScope.IMAGE_MODEL,
  contents:
    'Create a whimsical watercolor illustration of a tiny clockwork owl perched on a lantern in a misty forest, and include a one-sentence caption.',
  config: {
    responseModalities: [
      persistentScope.Modality.TEXT,
      persistentScope.Modality.IMAGE,
    ],
  },
});

for (const part of genResponse.candidates?.[0]?.content?.parts ?? []) {
  if (part.text) {
    console.log(part.text);
  } else if (part.inlineData?.data) {
    persistentScope.lastImage = {
      data: part.inlineData.data,
      mimeType: part.inlineData.mimeType || 'image/png',
    };
    console.image(
      persistentScope.lastImage.data,
      persistentScope.lastImage.mimeType,
    );
  }
}
// [CODE ENDS]

/* Markdown (render)
## 3. Edit the Generated Image

Pass the generated image back to `gemini-2.5-flash-image` with a natural-language edit instruction.
*/

// [CODE STARTS]
if (!persistentScope.lastImage) {
  throw new Error('Run Cell 2 first so persistentScope.lastImage is available.');
}

const editResponse = await persistentScope.ai.models.generateContent({
  model: persistentScope.IMAGE_MODEL,
  contents: [
    {
      inlineData: {
        data: persistentScope.lastImage.data,
        mimeType: persistentScope.lastImage.mimeType,
      },
    },
    {
      text: 'Add a tiny brass monocle and a starry night sky with crescent moon behind the owl while keeping the watercolor style.',
    },
  ],
  config: {
    responseModalities: [
      persistentScope.Modality.TEXT,
      persistentScope.Modality.IMAGE,
    ],
  },
});

for (const part of editResponse.candidates?.[0]?.content?.parts ?? []) {
  if (part.text) {
    console.log(part.text);
  } else if (part.inlineData?.data) {
    console.image(part.inlineData.data, part.inlineData.mimeType || 'image/png');
  }
}
// [CODE ENDS]
