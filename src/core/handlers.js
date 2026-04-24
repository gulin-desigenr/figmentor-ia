import { traverseNode } from './traverse.js';
import { extractBorders, extractShadows, extractTextStyle, extractBackground } from '../styles/index.js';
import { figmaColorToRGBA } from '../utils/colors.js';
import { sanitizeCssId } from '../utils/cssId.js';
import { getIterableNodes, getLayoutDirection, hasImageFill, getNodeRole } from '../utils/nodes.js';

export async function handleManualTag(node, tag, isRoot, maps) {
  if (tag === 'container' || tag === 'container-full' || tag === 'page-wrapper') {
    let children = [];
    const childIsRoot = (tag === 'page-wrapper');
    
    if ("children" in node) {
      for (const child of node.children) {
        const res = await traverseNode(child, childIsRoot, maps, true);
        if (res) {
          if (Array.isArray(res)) children = children.concat(res);
          else children.push(res);
        }
      }
    }
    
    // Checkpoint 6: Pseudo-Wrapper logic
    if (tag === 'page-wrapper') {
      return children;
    }

    return await mapContainer(node, children, isRoot, tag === 'container-full', maps);
  }

  let textNodes = [];
  if (node.type === "TEXT") textNodes.push(node);
  else if ("findAll" in node) textNodes = node.findAll(n => n.type === "TEXT");

  const texts = textNodes.map(t => t.characters);
  const styles = await Promise.all(textNodes.map(t => extractTextStyle(t, maps)));
  const mainStyle = styles.length > 0 ? styles[0] : { color: "", size: 16, weight: "400" };
  const secStyle = styles.length > 1 ? styles[1] : mainStyle;

  let settings = { align: "center" };
  let bgSettings = {};

  if (node.type !== "TEXT") {
    bgSettings = await extractBackground(node, maps);
    if (bgSettings.background_background) {
      settings._background_background = bgSettings.background_background;
      settings._background_color = bgSettings.background_color;
      if (bgSettings.__globals__) settings.__globals__ = Object.assign({}, settings.__globals__ || {}, bgSettings.__globals__);
    }
  }

  extractBorders(node, settings, true, tag);
  extractShadows(node, settings, true, tag);

  if (tag === "image-box") {
    let titleNode = textNodes.find(n => getNodeRole(n) === 'title_text');
    let descNode = textNodes.find(n => getNodeRole(n) === 'description_text');

    settings.title_text = titleNode ? titleNode.characters : (texts[0] || "Título");
    let tStyle = titleNode ? await extractTextStyle(titleNode, maps) : mainStyle;
    if (tStyle.color) settings.title_color = tStyle.color;
    if (tStyle.globalColorId) {
      settings.__globals__ = settings.__globals__ || {};
      settings.__globals__.title_color = `globals/colors?id=${tStyle.globalColorId}`;
    }
    if (tStyle.globalTypoId) {
      settings.__globals__ = settings.__globals__ || {};
      settings.__globals__.title_typography_typography = `globals/typography?id=${tStyle.globalTypoId}`;
    }
    settings.title_typography_typography = "custom";
    settings.title_typography_font_size = { size: tStyle.size, unit: "px" };
    settings.title_typography_font_weight = tStyle.weight;
    if (tStyle.fontFamily) settings.title_typography_font_family = tStyle.fontFamily; // B4

    settings.description_text = descNode ? descNode.characters : texts.slice(1).join(" ");
    let dStyle = descNode ? await extractTextStyle(descNode, maps) : secStyle;
    if (dStyle.color) settings.description_color = dStyle.color;
    if (dStyle.globalColorId) {
      settings.__globals__ = settings.__globals__ || {};
      settings.__globals__.description_color = `globals/colors?id=${dStyle.globalColorId}`;
    }
    if (dStyle.globalTypoId) {
      settings.__globals__ = settings.__globals__ || {};
      settings.__globals__.description_typography_typography = `globals/typography?id=${dStyle.globalTypoId}`;
    }
    settings.description_typography_typography = "custom";
    settings.description_typography_font_size = { size: dStyle.size, unit: "px" };
    settings.description_typography_font_weight = dStyle.weight;
    if (dStyle.fontFamily) settings.description_typography_font_family = dStyle.fontFamily; // B4

    settings.image = { url: "", id: "" };
  }
  else if (tag === "icon-box") {
    let titleNode = textNodes.find(n => getNodeRole(n) === 'title_text');
    let descNode = textNodes.find(n => getNodeRole(n) === 'description_text');

    settings.title_text = titleNode ? titleNode.characters : (texts[0] || "Título do Ícone");
    settings.title = settings.title_text;

    let tStyle = titleNode ? await extractTextStyle(titleNode, maps) : mainStyle;
    if (tStyle.color) settings.title_color = tStyle.color;
    if (tStyle.globalColorId) {
      settings.__globals__ = settings.__globals__ || {};
      settings.__globals__.title_color = `globals/colors?id=${tStyle.globalColorId}`;
    }
    if (tStyle.globalTypoId) {
      settings.__globals__ = settings.__globals__ || {};
      settings.__globals__.title_typography_typography = `globals/typography?id=${tStyle.globalTypoId}`;
    }
    settings.title_typography_typography = "custom";
    settings.title_typography_font_size = { size: tStyle.size, unit: "px" };
    settings.title_typography_font_weight = tStyle.weight;
    if (tStyle.fontFamily) settings.title_typography_font_family = tStyle.fontFamily; // B5

    settings.description_text = descNode ? descNode.characters : texts.slice(1).join(" ");
    settings.description = settings.description_text;

    let dStyle = descNode ? await extractTextStyle(descNode, maps) : secStyle;
    if (dStyle.color) settings.description_color = dStyle.color;
    if (dStyle.globalColorId) {
      settings.__globals__ = settings.__globals__ || {};
      settings.__globals__.description_color = `globals/colors?id=${dStyle.globalColorId}`;
    }
    if (dStyle.globalTypoId) {
      settings.__globals__ = settings.__globals__ || {};
      settings.__globals__.description_typography_typography = `globals/typography?id=${dStyle.globalTypoId}`;
    }
    settings.description_typography_typography = "custom";
    settings.description_typography_font_size = { size: dStyle.size, unit: "px" };
    settings.description_typography_font_weight = dStyle.weight;
    if (dStyle.fontFamily) settings.description_typography_font_family = dStyle.fontFamily; // B5

    let iconColor = mainStyle.color;
    let iconName = "fas fa-star";

    let vectorNodes = [];
    if (node.type === "VECTOR" || node.type === "BOOLEAN_OPERATION") vectorNodes.push(node);
    else if ("findAll" in node) vectorNodes = node.findAll(n => n.type === "VECTOR" || n.type === "BOOLEAN_OPERATION");

    let specificIconVector = vectorNodes.find(n => getNodeRole(n) === 'icon');
    if (specificIconVector) vectorNodes = [specificIconVector];

    if (vectorNodes.length > 0) {
      const vector = vectorNodes[0];
      if (vector.name.startsWith("fas ") || vector.name.startsWith("fab ") || vector.name.startsWith("far ")) {
        iconName = vector.name;
      }
      if (vector.fills && vector.fills !== figma.mixed && vector.fills.length > 0) {
        if (vector.fills[0].type === "SOLID") {
          iconColor = figmaColorToRGBA(vector.fills[0].color, vector.fills[0].opacity);
        }
      }
    }

    settings.selected_icon = { value: iconName, library: iconName.startsWith("fab") ? "fa-brands" : "fa-solid" };
    if (iconColor) settings.primary_color = iconColor;
  }
  else if (tag === "icon-list") {
    let listItems = texts;
    if (listItems.length === 0) listItems = ["Item Lista 1", "Item Lista 2", "Item Lista 3"];

    settings.icon_list = listItems.map(t => ({
      text: t,
      selected_icon: { value: "fas fa-check", library: "fa-solid" }
    }));

    if (mainStyle.color) {
      settings.icon_color = mainStyle.color;
      settings.text_color = mainStyle.color;
    }
    if (mainStyle.globalColorId) {
      settings.__globals__ = settings.__globals__ || {};
      settings.__globals__.icon_color = `globals/colors?id=${mainStyle.globalColorId}`;
      settings.__globals__.text_color = `globals/colors?id=${mainStyle.globalColorId}`;
    }
    if (mainStyle.globalTypoId) {
      settings.__globals__ = settings.__globals__ || {};
      settings.__globals__.text_typography_typography = `globals/typography?id=${mainStyle.globalTypoId}`;
    }

    settings.text_typography_typography = "custom";
    settings.text_typography_font_size = { size: mainStyle.size, unit: "px" };
    settings.text_typography_font_weight = mainStyle.weight;
    if (mainStyle.fontFamily) settings.text_typography_font_family = mainStyle.fontFamily; // B6
  }
  else if (tag === "heading") {
    settings.title = texts.join(" ");
    if (mainStyle.color) settings.title_color = mainStyle.color;
    if (mainStyle.globalColorId) {
      settings.__globals__ = settings.__globals__ || {};
      settings.__globals__.title_color = `globals/colors?id=${mainStyle.globalColorId}`;
    }
    if (mainStyle.globalTypoId) {
      settings.__globals__ = settings.__globals__ || {};
      settings.__globals__.typography_typography = `globals/typography?id=${mainStyle.globalTypoId}`;
    }
    settings.typography_typography = "custom";
    settings.typography_font_size = { size: mainStyle.size, unit: "px" };
    settings.typography_font_weight = mainStyle.weight;
    if (mainStyle.fontFamily) settings.typography_font_family = mainStyle.fontFamily; // B1
  }
  else if (tag === "text-editor") {
    settings.editor = texts.join("<br>");
    if (mainStyle.color) settings.text_color = mainStyle.color;
    if (mainStyle.globalColorId) {
      settings.__globals__ = settings.__globals__ || {};
      settings.__globals__.text_color = `globals/colors?id=${mainStyle.globalColorId}`;
    }
    if (mainStyle.globalTypoId) {
      settings.__globals__ = settings.__globals__ || {};
      settings.__globals__.typography_typography = `globals/typography?id=${mainStyle.globalTypoId}`;
    }
    settings.typography_typography = "custom";
    settings.typography_font_size = { size: mainStyle.size, unit: "px" };
    settings.typography_font_weight = mainStyle.weight;
    if (mainStyle.fontFamily) settings.typography_font_family = mainStyle.fontFamily; // B2
  }

  else if (tag === "button") {
    try {
      settings.text = texts.join(" ") || "Clique Aqui";

      if (mainStyle.color) {
        settings.text_color = mainStyle.color;
      }
      if (mainStyle.globalColorId) {
        settings.__globals__ = settings.__globals__ || {};
        settings.__globals__.button_text_color = `globals/colors?id=${mainStyle.globalColorId}`;
      }
      if (mainStyle.globalTypoId) {
        settings.__globals__ = settings.__globals__ || {};
        settings.__globals__.typography_typography = `globals/typography?id=${mainStyle.globalTypoId}`;
      }

      settings.typography_typography = "custom";
      settings.typography_font_size = { size: mainStyle.size, unit: "px" };
      settings.typography_font_weight = mainStyle.weight;
      if (mainStyle.fontFamily) settings.typography_font_family = mainStyle.fontFamily; // B3

      if (settings._background_color) {
        settings.background_color = settings._background_color;
        if (bgSettings.globalColorId) {
          settings.__globals__ = settings.__globals__ || {};
          settings.__globals__.background_color = `globals/colors?id=${bgSettings.globalColorId}`;
        }
        delete settings._background_color;
        delete settings._background_background;
      }

      let paddingTop = node.paddingTop || 0;
      let paddingBottom = node.paddingBottom || 0;
      let sumPadding = paddingTop + paddingBottom;
      if (sumPadding >= 40) settings.size = "lg";
      else if (sumPadding >= 20) settings.size = "md";
      else settings.size = "sm";

      let align = "justify";
      if (node.layoutSizingHorizontal === "FILL") align = "justify";
      else if (node.primaryAxisAlignItems === "CENTER") align = "center";
      else if (node.primaryAxisAlignItems === "MAX") align = "right";
      else align = "left";
      settings.align = align;

      let vectorNodes = [];
      if ("findAll" in node) {
        vectorNodes = node.findAll(n => n.type === "VECTOR" || n.type === "BOOLEAN_OPERATION");
      }

      let specificIconVector = vectorNodes.find(n => getNodeRole(n) === 'icon');
      if (specificIconVector) vectorNodes = [specificIconVector];

      if (vectorNodes.length > 0) {
        const vector = vectorNodes[0];
        if (vector.name.startsWith("fas ") || vector.name.startsWith("fab ") || vector.name.startsWith("far ")) {
          settings.selected_icon = { value: vector.name, library: vector.name.startsWith("fab") ? "fa-brands" : "fa-solid" };
          if (textNodes.length > 0 && vector.x > textNodes[0].x) {
            settings.icon_align = "right";
          } else {
            settings.icon_align = "left";
          }
          settings.icon_indent = { size: node.itemSpacing || 5, unit: "px" };
        }
      }

      if (node.reactions && node.reactions.length > 0) {
        const reaction = node.reactions.find(r => r.action && r.action.type === "URL");
        if (reaction) {
          settings.link = { url: reaction.action.url, is_external: true };
        }
      }
    } catch (err) {
      console.error("Erro crítico extraindo button, ignorando componente:", err);
      return null;
    }
  }
  else if (tag === "image") {
    settings.image = { url: "", id: "" };
    settings._width = { size: node.width, unit: "px" };
  }
  else if (tag === "image-carousel") {
    const iterableNodes = getIterableNodes(node);
    const carouselItems = [];
    
    for (const child of iterableNodes) {
      if (child.type === "IMAGE" || hasImageFill(child) || child.type === "RECTANGLE" || child.type === "FRAME") {
        carouselItems.push({ id: child.id || "", url: "" });
      } else {
        carouselItems.push({ id: "", url: "" });
      }
    }
    
    if (carouselItems.length === 0) carouselItems.push({ id: "", url: "" });

    settings.carousel = carouselItems;
    settings.slides_to_show = "3";
    settings.slides_to_scroll = "1";
    settings.navigation = "both";
    settings.image_size = "full";
  }
  else if (tag === "container-carousel") {
    const iterableNodes = getIterableNodes(node);
    let elements = [];
    
    for (const child of iterableNodes) {
      const res = await traverseNode(child, false, maps, true);
      if (res) {
        if (Array.isArray(res)) {
          elements.push({ elType: "container", settings: {}, elements: res });
        }
        else if (res.elType !== "container") {
          elements.push({ elType: "container", settings: {}, elements: [res] });
        }
        else {
          elements.push(res);
        }
      }
    }

    settings.slides_to_show = "3";
    settings.slides_to_scroll = "1";
    settings.navigation = "both";

    const cssId = sanitizeCssId(node.name);
    if (cssId) settings.css_id = cssId;
    
    return { elType: "widget", widgetType: "nested-carousel", settings: settings, elements: elements };
  }

  const cssId = sanitizeCssId(node.name);
  if (cssId) settings.css_id = cssId;

  return { elType: "widget", widgetType: tag, settings: settings };
}

export async function mapContainer(node, children, isRoot, isForcedFull, maps) {
  try {
    if (!children || children.length === 0) return null;
    const isBoxed = (isRoot === true && isForcedFull === false);
    const bgSettings = await extractBackground(node, maps);
    const direction = getLayoutDirection(node);

    let containerWidth = { size: 100, unit: "%" };

    if (isRoot) {
      containerWidth = isBoxed ? { size: 1140, unit: "px" } : { size: 100, unit: "%" };
    } else {
      if (node.layoutSizingHorizontal === 'FIXED') {
        containerWidth = { size: node.width, unit: "px" };
      } else if (node.layoutSizingHorizontal === 'FILL') {
        containerWidth = { size: 100, unit: "%" };
      } else {
        containerWidth = { size: node.width, unit: "px" };
      }
    }

    let justifyContent = "flex-start";
    if (node.primaryAxisAlignItems === "CENTER") justifyContent = "center";
    else if (node.primaryAxisAlignItems === "MAX") justifyContent = "flex-end";
    else if (node.primaryAxisAlignItems === "SPACE_BETWEEN") justifyContent = "space-between";

    let alignItems = "flex-start";
    if (node.counterAxisAlignItems === "CENTER") alignItems = "center";
    else if (node.counterAxisAlignItems === "MAX") alignItems = "flex-end";

    let alignContent = "flex-start";
    if (node.primaryAxisAlignItems === "SPACE_BETWEEN") alignContent = "space-between";

    const settings = {
      content_width: isBoxed ? "boxed" : "full",
      width: containerWidth,
      flex_direction: direction,
      justify_content: justifyContent,
      align_items: alignItems,
      align_content: alignContent,
      gap: { column: node.itemSpacing || 0, row: node.itemSpacing || 0, unit: "px" },
      padding: {
        top: node.paddingTop || 0, 
        right: (isRoot && isBoxed) ? 0 : (node.paddingRight || 0),
        bottom: node.paddingBottom || 0, 
        left: (isRoot && isBoxed) ? 0 : (node.paddingLeft || 0),
        unit: "px"
      }
    };

    if (direction === "row") {
      settings.flex_wrap = "nowrap";
    }

    if (bgSettings.background_background) {
      settings.background_background = bgSettings.background_background;
      settings.background_color = bgSettings.background_color;
      if (bgSettings.globalColorId) {
        settings.__globals__ = settings.__globals__ || {};
        settings.__globals__.background_color = `globals/colors?id=${bgSettings.globalColorId}`;
      }
    }

    extractBorders(node, settings, false);
    extractShadows(node, settings, false);

    const cssId = sanitizeCssId(node.name);
    if (cssId) settings.css_id = cssId;

    return { elType: "container", settings: settings, elements: children };
  } catch (err) {
    console.error("Erro crítico em mapContainer, ignorando:", err);
    return null;
  }
}

export async function mapText(node, maps) {
  try {
    const style = await extractTextStyle(node, maps);
    const widgetType = style.size >= 32 ? "heading" : "text-editor";
    let settings = {
      align: "center",
      typography_typography: "custom",
      typography_font_size: { size: style.size, unit: "px" },
      typography_font_weight: style.weight
    };
    if (style.fontFamily) settings.typography_font_family = style.fontFamily; // B7

    if (style.globalColorId) {
      settings.__globals__ = settings.__globals__ || {};
      settings.__globals__[widgetType === "heading" ? "title_color" : "text_color"] = `globals/colors?id=${style.globalColorId}`;
    }
    if (style.globalTypoId) {
      settings.__globals__ = settings.__globals__ || {};
      settings.__globals__.typography_typography = `globals/typography?id=${style.globalTypoId}`;
    }

    extractShadows(node, settings, true);

    const cssId = sanitizeCssId(node.name);
    if (cssId) settings.css_id = cssId;

    if (widgetType === "heading") {
      settings.title = node.characters;
      if (style.color) settings.title_color = style.color;
    } else {
      settings.editor = node.characters;
      if (style.color) settings.text_color = style.color;
    }
    return { elType: "widget", widgetType: widgetType, settings: settings };
  } catch (err) {
    console.error("Erro crítico em mapText, ignorando:", err);
    return null;
  }
}

export async function mapImage(node) {
  let settings = { image: { url: "", id: "" }, align: "center" };

  extractBorders(node, settings, true, "image");
  extractShadows(node, settings, true, "image");

  const cssId = sanitizeCssId(node.name);
  if (cssId) settings.css_id = cssId;

  return { elType: "widget", widgetType: "image", settings: settings };
}
