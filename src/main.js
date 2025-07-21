const inputText = document.getElementById("inputText");
const btnGenerateText = document.getElementById("GenerateTextBtn");
const btnNightMode = document.getElementById("btnNightMode");
const btnGenerateImage = document.getElementById("generateImageBtn");
const dropdownImageCount = document.getElementById("optionImageCount");
const dropdownAspectRatio = document.getElementById("optionAspectRatio");
const gridGallery = document.getElementById("gallery-grid");
const previewContainer = document.getElementById("previewContainer");
const imgPreview = document.getElementById("imgPreview");
const previewOverlay = document.querySelector(".overlay");
const rootElement = document.documentElement;
const btnNightModeImage = document.getElementById("btnNightModeImage");
const errorBox = document.getElementById("error-box");
const errorMessage = document.getElementById("error-message");

const API_KEY = import.meta.env.VITE_HF_TOKEN;
const IMAGEBB_API_KEY = import.meta.env.VITE_IMAGEBB_API_KEY;

/**
 * Displays an error message in the error box.
 * @param {string} message - The error message to display.
 */
const showError = (message) => {
  errorMessage.textContent = message;
  errorBox.classList.remove("hidden");
};

/**
 * Hides the error box.
 */
const hideError = () => {
  errorBox.classList.add("hidden");
};

// Global error listeners to catch unhandled exceptions
window.addEventListener("error", (event) => {
  showError(`An unexpected error occurred: ${event.message}`);
});

window.addEventListener("unhandledrejection", (event) => {
  showError(`An asynchronous error occurred: ${event.reason}`);
});

/**
 * Toggles the color theme between light and dark mode.
 * Updates the night mode button icon accordingly.
 */
const toggleTheme = () => {
  const isDark = rootElement.classList.toggle("dark-theme");

  if (isDark) {
    btnNightModeImage.src = "./media/ic_sun.png"; // ☀️ Show sun in dark mode
    btnNightModeImage.alt = "Light mode";
  } else {
    btnNightModeImage.src = "./media/night-mode.png"; // 🌙 Show moon in light mode
    btnNightModeImage.alt = "Dark mode";
  }
};

btnNightMode.addEventListener("click", toggleTheme);

/**
 * Finds the closest allowed resolution for a given aspect ratio.
 * This helps ensure the generated image dimensions are supported by the API.
 * @param {string} aspectRatio - The desired aspect ratio (e.g., "16/9").
 * @returns {{width: number, height: number}} The closest matching dimensions.
 */
const getImageDimensions = (aspectRatio) => {
  const ALLOWED_RESOLUTIONS = [
    [1024, 1024],
    [1152, 896],
    [896, 1152],
    [1216, 832],
    [832, 1216],
    [1344, 768],
    [768, 1344],
    [1536, 640],
    [640, 1536],
  ];

  const [width, height] = aspectRatio.split("/").map(Number);
  const targetRatio = width / height;

  let closestResolution = ALLOWED_RESOLUTIONS[0];
  let smallestDifference = Math.abs(
    closestResolution[0] / closestResolution[1] - targetRatio
  );

  for (const [w, h] of ALLOWED_RESOLUTIONS) {
    const currentRatio = w / h;
    const difference = Math.abs(currentRatio - targetRatio);

    if (difference < smallestDifference) {
      closestResolution = [w, h];
      smallestDifference = difference;
    }
  }

  return {
    width: closestResolution[0],
    height: closestResolution[1],
  };
};

/**
 * Generates a specified number of images based on a prompt and aspect ratio.
 * @param {string} aspectRatio - The aspect ratio for the images.
 * @param {number} imageCount - The number of images to generate.
 * @param {string} promptText - The text prompt for image generation.
 * @returns {Promise<string[]>} A promise that resolves to an array of Base64 image data URLs.
 */
const generateImages = async (aspectRatio, imageCount, promptText) => {
  const imageUrls = [];

  // pseudo code
  // for (let i = 0; i < imageCount; i++) {
  //   imageUrls.push("./media/ic_ai_image.png");
  // }
  // return imageUrls;

  const MODEL_URL = `https://router.huggingface.co/hyperbolic/v1/images/generations`;
  const { width, height } = getImageDimensions(aspectRatio);

  for (let i = 0; i < imageCount; i++) {
    try {
      const response = await fetch(MODEL_URL, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          prompt: promptText,
          model_name: "SD2",
          width: width,
          height: height,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        showError(`API Error: ${response.status} - ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      const imageUrl = `data:image/png;base64,${result.images[0].image}`;

      console.log(imageUrl);

      imageUrls.push(imageUrl);
    } catch (error) {
      console.error("Image generation error:", error);
      showError("Failed to generate image. The API may be down or the request failed.");
      return [];
    }
  }

  return imageUrls;
};

/**
 * Displays a larger preview of a selected image in an overlay.
 * @param {string} url - The URL of the image to preview.
 * @param {string} aspectRatio - The aspect ratio of the image.
 */
const showImagePreview = (url, aspectRatio) => {
  imgPreview.src = url;
  imgPreview.style.aspectRatio = aspectRatio;
  previewOverlay.style.display = "flex";
};

/**
 * Hides the image preview overlay.
 */
const hideImagePreview = () => {
  previewOverlay.style.display = "none";
};

/**
 * Triggers a browser download for a given image URL.
 * @param {string} imageUrl - The URL of the image to download.
 * @param {string} [fileName="image.png"] - The desired file name for the download.
 */
function downloadImage(imageUrl, fileName = "image.png") {
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Uploads a Base64 encoded image to ImgBB and returns a public URL.
 * @param {string} base64Image - The Base64 data URL of the image.
 * @returns {Promise<string|null>} A promise that resolves to the public image URL, or null on failure.
 */
async function uploadImageToImgBB(base64Image) {
  const apiKey = IMAGEBB_API_KEY; // Replace with your real key
  const formData = new FormData();
  formData.append("key", apiKey);
  formData.append("image", base64Image.split(",")[1]); // Remove data URL prefix

  try {
    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (result.success) {
      return result.data.url; // 👈 Public image URL
    } else {
      throw new Error("Upload failed");
    }
  } catch (error) {
    console.error("Image upload failed:", error);
    showError("Image upload failed. Please try again.");
    return null;
  }
}

/**
 * Uploads an image to a hosting service and uses the Web Share API to share it.
 * Falls back to copying the share text to the clipboard if Web Share is not supported.
 * @param {string} imageUrl - The Base64 data URL of the image.
 * @param {string} promptText - The original prompt used to generate the image.
 * @param {number} imageIndex - The index of the image (for context).
 */
async function shareImageFile(imageUrl, promptText, imageIndex) {
  // Show loading message
  const loadingMessage = document.createElement("div");
  loadingMessage.innerText = "Uploading image for sharing...";
  loadingMessage.className = "share-message";
  document.body.appendChild(loadingMessage);

  const hostedImageUrl = await uploadImageToImgBB(imageUrl);
  document.body.removeChild(loadingMessage);

  if (!hostedImageUrl) {
    alert("Image upload failed. Cannot share.");
    showError("Image upload failed. Please try again.");
    return;
  }

  // Show final share button
  const shareButton = document.createElement("button");
  shareButton.innerText = "Tap to Share Image";
  shareButton.className = "share-button-final";
  document.body.appendChild(shareButton);

  const shareText = `🎨 AI Image Prompt: "${promptText}"\n\nView the image: ${hostedImageUrl}`;
  const shareData = {
    title: "AI Art by Arvin Kumar AI",
    text: shareText,
    url: hostedImageUrl,
  };

  shareButton.addEventListener("click", async () => {
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        console.log("✅ Image shared successfully");
      } else {
        await navigator.clipboard.writeText(shareText);
        alert("Sharing not supported. Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Sharing failed:", err);
      alert("Failed to share. Copied to clipboard.");
      await navigator.clipboard.writeText(shareText);
    }

    document.body.removeChild(shareButton); // clean up
  });
}

previewOverlay.addEventListener("click", hideImagePreview);

/**
 * Creates the HTML structure for a single loading placeholder card.
 * @param {string} aspectRatio - The aspect ratio for the card.
 * @param {number} index - The index of the card.
 * @returns {HTMLElement} The created card element.
 */
const createLoadingCard = (aspectRatio, index) => {
  const card = document.createElement("div");
  card.className = "img-card loading";
  card.style.aspectRatio = aspectRatio;
  card.innerHTML = `
      <div class="status">
        <div class="spinner"></div>
        <p class="status-text">Generating...</p>
      </div>
      <img src="./media/ic_ai_image.png" class="result-img" />
      <div class="img-overlay">
        <button class="img-download-btn">
          <img src="./media/downloads.png" alt="Download" />
        </button>
        <button class="img-share-btn" data-image-index="${index}">
          <img src="./media/share.png" alt="Share" />
        </button>
      </div>
    `;
  return card;
};

/**
 * Clears the gallery and displays a set of loading placeholder cards.
 * @param {number} imageCount - The number of loading cards to display.
 * @param {string} aspectRatio - The aspect ratio for the cards.
 */
const showLoadingCards = (imageCount, aspectRatio) => {
  gridGallery.innerHTML = "";
  for (let i = 0; i < imageCount; i++) {
    const card = createLoadingCard(aspectRatio, i);
    gridGallery.appendChild(card);
  }
};

/**
 * Adds click event listeners to an image card for preview, download, and share actions.
 * @param {HTMLElement} card - The card element.
 * @param {string} url - The image URL.
 * @param {string} aspectRatio - The image aspect ratio.
 * @param {string} promptText - The original generation prompt.
 * @param {number} index - The index of the card.
 */
const addCardEventListeners = (card, url, aspectRatio, promptText, index) => {
  const cardOverlay = card.querySelector(".img-overlay");
  if (cardOverlay) {
    cardOverlay.addEventListener("click", () => {
      showImagePreview(url, aspectRatio);
    });
  }

  const downloadBtn = card.querySelector(".img-download-btn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering preview
      downloadImage(url, `image_${index + 1}.png`);
    });
  }

  // Add share button functionality
  const shareBtn = card.querySelector(".img-share-btn");
  if (shareBtn) {
    shareBtn.addEventListener("click", async (e) => {
      e.stopPropagation(); // Prevent triggering preview
      await shareImageFile(url, promptText, index);
    });
  }
};

/**
 * Replaces a loading card with the final generated image and attaches event listeners.
 * @param {HTMLElement} card - The loading card to update.
 * @param {string} url - The URL of the generated image.
 * @param {string} aspectRatio - The aspect ratio of the image.
 * @param {string} promptText - The original prompt text.
 * @param {number} index - The index of the card.
 */
const updateCardWithImage = (card, url, aspectRatio, promptText, index) => {
  if (!card) return;

  const img = card.querySelector("img.result-img");
  img.src = url;

  // Remove loading spinner
  card.classList.remove("loading");
  addCardEventListeners(card, url, aspectRatio, promptText, index);
};

/**
 * Orchestrates the entire image generation and display process.
 * Shows loading cards, generates images, and then updates the cards with the results.
 * @param {string} aspectRatio - The desired aspect ratio.
 * @param {number} imageCount - The number of images to create.
 * @param {string} promptText - The text prompt for generation.
 */
const createImageCards = async (aspectRatio, imageCount, promptText) => {
  showLoadingCards(imageCount, aspectRatio);

  // Generate actual images
  const imageUrls = await generateImages(aspectRatio, imageCount, promptText);

  // Validate Image Urls
  if (imageUrls.length <= 0) {
    console.error("No image URLs returned. Generation may have failed.");
    showError("Image generation failed. No images were returned.");
    const cards = gridGallery.querySelectorAll(".img-card");
    cards.forEach((card) => {
      const statusText = card.querySelector(".status-text");
      if (statusText) statusText.textContent = "Failed";
      const spinner = card.querySelector(".spinner");
      if (spinner) spinner.style.display = "none";
    });
    return;
  }

  // Replace loading cards with real images
  const cards = gridGallery.querySelectorAll(".img-card");
  imageUrls.forEach((url, i) => {
    updateCardWithImage(cards[i], url, aspectRatio, promptText, i);
  });
};

btnGenerateImage.addEventListener("click", async (e) => {
  e.preventDefault();
  hideError();

  const imageCount = dropdownImageCount.value;
  const aspectRatio = dropdownAspectRatio.value;
  const promptText = inputText.value.trim();

  if (!promptText) {
    showError("Please enter a prompt.");
    return;
  }

  if (!aspectRatio) {
    showError("Please select an aspect ratio.");
    return;
  }

  if (!imageCount) {
    showError("Please select the number of images.");
    return;
  }

  console.log(parseInt(imageCount), aspectRatio, promptText);
  showLoading(false);
  await createImageCards(aspectRatio, parseInt(imageCount), promptText);
  removeLoading();
});

/**
 * Fetches a creative image generation prompt from a large language model.
 * @returns {Promise<string|undefined>} A promise that resolves to the generated prompt string.
 */
const getImagePrompt = async () => {
  const response = await fetch(
    "https://router.huggingface.co/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-4-Scout-17B-16E-Instruct:fireworks-ai",
        messages: [
          {
            role: "system",
            content: `
You are an AI assistant that generates creative prompts for AI image generation.

Your task is to output one single-line prompt per request. The prompt must follow this structure:

[main subject(s)] in [setting/environment], [notable visual elements], [lighting or mood], [optional art style or technique]

Guidelines:
- Output only one prompt as plain text with no quotes, formatting, or explanations.
- The prompt must be visually rich, imaginative, and concise (15-30 words).
- It must include a clear subject, setting, mood or lighting, and optionally an art style.
- Avoid generic phrases and repetition.
- Ensure the content is unique, creative, and safe for all audiences.
- Do not return anything except the prompt itself. No commentary, prefixes, suffixes, or markdown.
        `.trim(),
          },
        ],
      }),
    }
  );

  const apiResponse = await response.json();
  return apiResponse.choices?.[0]?.message?.content?.trim();
};

btnGenerateText.addEventListener("click", async () => {
  try {
    showLoading(true);
    const response = await getImagePrompt();
    removeLoading();
    const prompt = response;

    if (!prompt) {
      console.error("No prompt returned from LLM");
      showError("Failed to generate a prompt. The AI might be offline.");
      inputText.value = "Failed to generate prompt.";
      return;
    }

    inputText.value = prompt;
    btnGenerateText.focus();
  } catch (error) {
    console.error("Prompt generation failed:", error);
    showError("An error occurred while generating the prompt.");
    inputText.value = "Error generating prompt.";
  }
});

/**
 * Disables UI elements and shows a loading state.
 * @param {boolean} showGeneratingPlaceholder - If true, updates the input placeholder to indicate prompt generation.
 */
const showLoading = (showGeneratingPlaceholder) => {
  if (showGeneratingPlaceholder) {
    inputText.placeholder = "Generating prompt...";
  }

  inputText.value = "";
  inputText.disabled = true;

  btnGenerateText.disabled = true;
  btnGenerateText.classList.add("disabled");
  btnGenerateImage.disabled = true;
  btnGenerateImage.classList.add("disabled");
  dropdownAspectRatio.disabled = true;
  dropdownAspectRatio.classList.add("disabled");
  dropdownImageCount.disabled = true;
  dropdownImageCount.classList.add("disabled");
};

/**
 * Re-enables UI elements and removes the loading state.
 */
const removeLoading = () => {
  inputText.disabled = false;
  inputText.placeholder = "Describe your imagination in detail... ";
  btnGenerateText.disabled = false;
  btnGenerateImage.disabled = false;
  dropdownAspectRatio.disabled = false;
  dropdownImageCount.disabled = false;
  btnGenerateText.classList.remove("disabled");
  btnGenerateImage.classList.remove("disabled");
  dropdownAspectRatio.classList.remove("disabled");
  dropdownImageCount.classList.remove("disabled");

};
