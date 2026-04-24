export function getIterableNodes(node) {
  if ("children" in node && node.children.length > 0) {
    return node.children.filter(c => c.visible);
  }
  
  const selection = figma.currentPage.selection;
  if (selection.length > 1 && selection.includes(node)) {
    return selection.filter(n => n.visible);
  }
  
  return [node];
}

export function getLayoutDirection(node) {
  if (node.layoutMode === "HORIZONTAL") return "row";
  if (node.layoutMode === "VERTICAL") return "column";

  if (node.children) {
    const visibleChildren = node.children.filter(c => c.visible);
    if (visibleChildren.length >= 2) {
      const child1 = visibleChildren[0];
      const child2 = visibleChildren[1];
      if (Math.abs(child1.y - child2.y) < 20) return "row";
    }
  }
  return "column";
}

export function hasImageFill(node) {
  if (!node.fills || node.fills === figma.mixed) return false;
  return Array.isArray(node.fills) && node.fills.some(f => f.type === 'IMAGE');
}

export function getNodeRole(node) {
  const pluginRole = node.getPluginData("elementor_role");
  if (pluginRole) return pluginRole;
  
  const name = (node.name || "").toLowerCase();
  if (name.includes('[title]')) return 'title_text';
  if (name.includes('[description]')) return 'description_text';
  if (name.includes('[icon]')) return 'icon';
  if (name.includes('[image]')) return 'image';
  
  return null;
}

export function getSafeFontFamily(node) {
  if (!node || node.fontName === figma.mixed || !node.fontName) return null;
  return node.fontName.family || null;
}

