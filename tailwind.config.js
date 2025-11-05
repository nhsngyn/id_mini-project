// tailwind.config.js
module.exports = {
  content: ["./*.html", "./**/*.html", "./js/**/*.js"],
  theme: {
    extend: {
      colors: {
        black: "#13151A",
        panel: "#181A20",
        gray800: "#21252C",
        gray700: '#474F59',
        gray400: '#6C7989',
        gray30: "rgba(55,60,66,0.30)",
        text: "#E7E7EA",
        muted: "#A6A7AB",
        accent: "#00FFCC",
        up: "#3ED598",
        down: "#F76E6E",
        green_light: "#4FF68C",
        red_light: "#FF3B52",
        gray100: "#E4E6ED",
        gray300: "#818D9C",
        gray80: "rgba(46,46,52,0.80)",
        blue300: "#6D89AB",
        blue100: "#D6E6F8",
      },
      fontFamily: {
        sans: ["Poppins", "system-ui", "-apple-system", "sans-serif"],
      },
      spacing: {
        // 고정 사이즈를 spacing으로 등록하면 가독성↑
        "price-w": "1316px",
        "price-h": "470px",
        "volume-h": "120px",
        "divider-w": "1408px",
      },
      borderRadius: {
        "card-t": "10px",
        "card-b": "10px",
      },
    },
  },
  plugins: [],
};
