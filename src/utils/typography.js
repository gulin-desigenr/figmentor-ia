export function mapFontWeight(style) {
  const weights = {
    "Thin": "100", "Hairline": "100",
    "Extra Light": "200", "Ultra Light": "200",
    "Light": "300", "Regular": "400", "Normal": "400",
    "Medium": "500", "Semi Bold": "600", "Demi Bold": "600",
    "Bold": "700", "Extra Bold": "800", "Ultra Bold": "800",
    "Black": "900", "Heavy": "900"
  };
  const match = Object.keys(weights).find(key => style.includes(key));
  return weights[match] || "400";
}

export function applyTypographySettings(settings, style, prefix = "typography") {
  settings[`${prefix}_typography`] = "custom";

  if (style.size) settings[`${prefix}_font_size`] = { size: style.size, unit: "px" };
  if (style.weight) settings[`${prefix}_font_weight`] = style.weight;
  if (style.fontFamily) settings[`${prefix}_font_family`] = style.fontFamily;
  if (style.lineHeight) settings[`${prefix}_line_height`] = style.lineHeight;
  if (style.letterSpacing) settings[`${prefix}_letter_spacing`] = style.letterSpacing;
  if (style.textTransform) settings[`${prefix}_text_transform`] = style.textTransform;
  if (style.textDecoration) settings[`${prefix}_text_decoration`] = style.textDecoration;
  if (style.fontStyle) settings[`${prefix}_font_style`] = style.fontStyle;
}
