/**
 * Dữ liệu mẫu đầy đủ (album, thư, nhạc, món quà cuối) — dùng cho ?mode=demo
 */
(function (global) {
  function getDefaultDemoData() {
    return {
      intro: {
        recipientName: "My Love",
      },
      music: {
        tracks: [
          "./assets/audios/Happy Birthday to You  - AMEE x Hoàng Dũng.mp3",
        ],
        selectedTrackUrl:
          "./assets/audios/Happy Birthday to You  - AMEE x Hoàng Dũng.mp3",
      },
      book: {
        images: [
          { url: "./assets/images/default_cover.png", alt: "Ảnh album 1" },
          { url: "./assets/images/default_cover.png", alt: "Ảnh album 2" },
          { url: "./assets/images/default_cover.png", alt: "Ảnh album 3" },
          { url: "./assets/images/default_cover.png", alt: "Ảnh album 4" },
          { url: "./assets/images/default_cover.png", alt: "Ảnh album 5" },
          { url: "./assets/images/default_cover.png", alt: "Ảnh album 6" },
        ],
      },
      letter: {
        title: "Em yêu à,",
        body:
          "Hôm nay là một ngày vô cùng đặc biệt - ngày mà một người tuyệt vời như em xuất hiện trên thế giới này. Anh chỉ muốn nói rằng, gặp được em là điều may mắn nhất trong cuộc đời anh.\n\n" +
          "Chúc em luôn xinh đẹp, hạnh phúc và mãi ở bên anh như bây giờ. Dù sau này có chuyện gì xảy ra, anh vẫn sẽ luôn nắm tay em thật chặt.",
        signature: "Yêu em nhiều hơn mỗi ngày.",
      },
      finalGift: {
        enabled: true,
        wishes: [
          "Happy Birthday 💕",
          "Yêu em nhất ❤️",
          "Tuổi mới thật hạnh phúc 💖",
        ],
      },
    };
  }

  global.__HB_getDefaultDemoData = getDefaultDemoData;
})(typeof window !== "undefined" ? window : globalThis);
