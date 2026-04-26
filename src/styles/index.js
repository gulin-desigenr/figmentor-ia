import { figmaColorToRGBA } from '../utils/colors.js';
import { mapFontWeight } from '../utils/typography.js';
import { getSafeFontFamily } from '../utils/nodes.js';

export function extractBorders(node, settings, isWidget = false, widgetType = "") {
  let radiusKey = isWidget ? "_border_radius" : "border_radius";
  let borderKey = isWidget ? "_border_border" : "border_border";
  let widthKey = isWidget ? "_border_width" : "border_width";
  let colorKey = isWidget ? "_border_color" : "border_color";

  if (widgetType === "image") {
    radiusKey = "image_border_radius";
    borderKey = "image_border_border";
    widthKey = "image_border_width";
    colorKey = "image_border_color";
  } else if (widgetType === "button") {
    radiusKey = "border_radius";
    borderKey = "border_border";
    widthKey = "border_width";
    colorKey = "border_color";
  }

  if (node.cornerRadius !== undefined) {
    if (node.cornerRadius === figma.mixed) {
      settings[radiusKey] = {
        unit: "px",
        top: String(node.topLeftRadius !== figma.mixed ? node.topLeftRadius || 0 : 0),
        right: String(node.topRightRadius !== figma.mixed ? node.topRightRadius || 0 : 0),
        bottom: String(node.bottomRightRadius !== figma.mixed ? node.bottomRightRadius || 0 : 0),
        left: String(node.bottomLeftRadius !== figma.mixed ? node.bottomLeftRadius || 0 : 0),
        isLinked: false
      };
    } else if (node.cornerRadius > 0) {
      settings[radiusKey] = {
        unit: "px",
        top: String(node.cornerRadius),
        right: String(node.cornerRadius),
        bottom: String(node.cornerRadius),
        left: String(node.cornerRadius),
        isLinked: true
      };
    }
  }

  if (node.strokes && node.strokes.length > 0 && node.strokeWeight !== figma.mixed && node.strokeWeight > 0) {
    const stroke = node.strokes[0];
    if (stroke.type === "SOLID") {
      settings[borderKey] = "solid";
      settings[widthKey] = {
        unit: "px",
        top: String(node.strokeWeight),
        right: String(node.strokeWeight),
        bottom: String(node.strokeWeight),
        left: String(node.strokeWeight),
        isLinked: true
      };
      settings[colorKey] = figmaColorToRGBA(stroke.color, stroke.opacity);
    }
  }
}

export function extractShadows(node, settings, isWidget = false, widgetType = "") {
  let prefix = isWidget ? "_box_shadow_" : "_box_shadow_";
  if (widgetType === "image") prefix = "image_box_shadow_";

  if (node.effects && node.effects.length > 0) {
    const shadow = node.effects.find(e => e.type === "DROP_SHADOW" && e.visible);
    if (shadow) {
      const shadowKey = widgetType === "image" ? "image_box_shadow" : prefix + "box_shadow";
      const typeKey = widgetType === "image" ? "image_box_shadow_type" : prefix + "box_shadow_type";

      settings[typeKey] = "yes";
      settings[shadowKey] = {
        horizontal: shadow.offset.x,
        vertical: shadow.offset.y,
        blur: shadow.radius,
        spread: shadow.spread || 0,
        color: figmaColorToRGBA(shadow.color, shadow.color.a),
        position: "outline"
      };
    }
  }
}

export async function extractTextStyle(node, maps = { colorMap: {}, typoMap: {} }) {
  let color = "";
  let globalColorId = null;
  let globalTypoId = null;

  if (node.fills && node.fills !== figma.mixed && node.fills.length > 0) {
    if (node.fills[0].type === "SOLID") {
      color = figmaColorToRGBA(node.fills[0].color, node.fills[0].opacity);
      
      if (node.fillStyleId) {
        const style = await figma.getStyleByIdAsync(node.fillStyleId);
        if (style && maps.colorMap && maps.colorMap[style.name]) {
          globalColorId = maps.colorMap[style.name];
        }
      }
    }
  }

  const size = (node.fontSize !== undefined && node.fontSize !== figma.mixed) ? node.fontSize : 16;
  let weight = "400";
  if (node.fontName !== undefined && node.fontName !== figma.mixed) {
    weight = mapFontWeight(node.fontName.style);
  }

  // A1/A2: Safe font-family extraction (guards figma.mixed and undefined)
  const fontFamily = getSafeFontFamily(node);

  let lineHeight = null;
  if (node.lineHeight !== undefined && node.lineHeight !== figma.mixed) {
    if (node.lineHeight.unit !== "AUTO") {
      lineHeight = {
        size: node.lineHeight.value,
        unit: node.lineHeight.unit === "PIXELS" ? "px" : "%"
      };
    }
  }

  let letterSpacing = null;
  if (node.letterSpacing !== undefined && node.letterSpacing !== figma.mixed) {
    if (node.letterSpacing.value !== 0) {
      letterSpacing = {
        size: node.letterSpacing.value,
        unit: node.letterSpacing.unit === "PIXELS" ? "px" : "em"
      };
    }
  }

  let textTransform = null;
  if (node.textCase !== undefined && node.textCase !== figma.mixed) {
    const caseMap = {
      UPPER: "uppercase",
      LOWER: "lowercase",
      TITLE: "capitalize",
      SMALL_CAPS: "uppercase"
    };
    textTransform = caseMap[node.textCase] || null;
  }

  let textDecoration = null;
  if (node.textDecoration !== undefined && node.textDecoration !== figma.mixed) {
    const decorMap = {
      UNDERLINE: "underline",
      STRIKETHROUGH: "line-through"
    };
    textDecoration = decorMap[node.textDecoration] || null;
  }

  let fontStyle = null;
  if (node.fontName !== undefined && node.fontName !== figma.mixed) {
    if (node.fontName.style.includes("Italic")) {
      fontStyle = "italic";
    }
  }

  if (node.textStyleId) {
    const style = await figma.getStyleByIdAsync(node.textStyleId);
    if (style && maps.typoMap && maps.typoMap[style.name]) {
      globalTypoId = maps.typoMap[style.name];
    }
  }

  return {
    color,
    size,
    weight,
    fontFamily,
    globalColorId,
    globalTypoId,
    lineHeight,
    letterSpacing,
    textTransform,
    textDecoration,
    fontStyle
  };
}

export async function extractBackground(node, maps = { colorMap: {}, typoMap: {} }) {
  let result = {};

  if (node.fills && node.fills !== figma.mixed && node.fills.length > 0) {

    const solidFill = node.fills.find(f => f.type === "SOLID" && f.visible !== false);
    if (solidFill) {
      const color = figmaColorToRGBA(solidFill.color, solidFill.opacity);
      let globalColorId = null;

      if (node.fillStyleId) {
        const style = await figma.getStyleByIdAsync(node.fillStyleId);
        if (style && maps.colorMap && maps.colorMap[style.name]) {
          globalColorId = maps.colorMap[style.name];
        }
      }

      result.background_background = "classic";
      result.background_color = color;
      if (globalColorId) result.globalColorId = globalColorId;
    }
  }

  return result;
}
