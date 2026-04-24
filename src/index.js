import { traverseNode } from './core/traverse.js';

try {
  figma.showUI(__html__, { width: 400, height: 620 });

  figma.ui.onmessage = (msg) => {
    try {
      if (msg.type === 'apply-tag') {
        const selection = figma.currentPage.selection;
        if (selection.length > 0) {
          selection.forEach(node => {
            node.setPluginData("elementor-tag", "");
            node.setPluginData("elementor-tag", msg.tag);

            let newName = node.name.replace(/\[.*?\]\s*/g, '');
            node.name = `[${msg.tag.toUpperCase()}] ${newName}`;
          });
          figma.notify("Tag Aplicada: " + msg.tag.toUpperCase());
        } else {
          figma.notify("Selecione algo primeiro.");
        }
      }

      if (msg.type === 'apply-role') {
        const selection = figma.currentPage.selection;
        if (selection.length > 0) {
          selection.forEach(node => {
            node.setPluginData("elementor_role", msg.role);
            
            let newName = node.name.replace(/\[(?:title|description|icon|image)\]\s*/gi, '');
            
            let roleLabel = msg.role;
            if (msg.role === 'title_text') roleLabel = 'title';
            if (msg.role === 'description_text') roleLabel = 'description';
              
            node.name = `[${roleLabel}] ${newName}`;
          });
          figma.notify("Sub-Tag Aplicada: " + msg.role);
        } else {
          figma.notify("Selecione um elemento interno primeiro.");
        }
      }

      if (msg.type === "export-json") {
        const selection = figma.currentPage.selection;
        if (selection.length === 0) { figma.notify("Selecione o Frame Principal."); return; }
        if (selection.length > 1) { figma.notify("🚨 Selecione apenas UM frame raiz. Use [PAGE-WRAPPER] com Auto Layout se necessário.", { error: true }); return; }

        figma.notify("⏳ Calculando árvore...");

        (async () => {
          try {
            const { colorMap, typoMap } = msg;
            let structure = await traverseNode(selection[0], true, { colorMap, typoMap });
            let content = Array.isArray(structure) ? structure : [structure];

            function sanitizeOutput(nodes) {
              if (!nodes || !Array.isArray(nodes)) return;
              nodes.forEach(node => {
                if (node && node.settings) {
                  delete node.settings._position;
                  delete node.settings.position;
                  delete node.settings.margin;
                  delete node.settings._margin;
                  delete node.settings.custom_css;
                  delete node.settings._offset_x;
                  delete node.settings._offset_y;
                  delete node.settings._z_index;
                  delete node.settings.offset_x;
                  delete node.settings.offset_y;
                }
                if (node && node.elements) {
                  sanitizeOutput(node.elements);
                }
              });
            }

            sanitizeOutput(content);

            const elementorJSON = {
              version: "0.4",
              title: "Export V19 Soltos Fix - " + selection[0].name,
              type: "container",
              content: content
            };

            figma.ui.postMessage({ type: "json-generated", data: JSON.stringify(elementorJSON, null, 2) });
            figma.notify("✅ JSON Gerado com Sucesso!");
          } catch (err) {
            figma.notify("Erro na exportação: " + err.message);
            console.error(err);
          }
        })();
      }


    } catch (e) {
      figma.notify("Erro Msg: " + e.message);
      console.error(e);
    }
  };
} catch (globalError) {
  console.error(globalError);
  figma.notify("Erro Fatal: " + globalError.message, { error: true });
}
