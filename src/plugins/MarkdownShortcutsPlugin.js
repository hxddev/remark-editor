import isHotkey from "is-hotkey";

function getBlockProp(chars) {
  switch (chars) {
    case "1.":
      return {
        type: "list",
        data: { ordered: true, start: null, spread: false }
      };
    case "*":
    case "-":
    case "+":
      return {
        type: "list",
        data: { ordered: false, start: null, spread: false }
      };
    case ">":
      return { type: "blockquote" };
    case "#":
      return { type: "heading", data: { depth: 1 } };
    case "##":
      return { type: "heading", data: { depth: 2 } };
    case "###":
      return { type: "heading", data: { depth: 3 } };
    case "####":
      return { type: "heading", data: { depth: 4 } };
    case "#####":
      return { type: "heading", data: { depth: 5 } };
    case "######":
      return { type: "heading", data: { depth: 6 } };
    default:
      return null;
  }
}

class MarkdownShortcutsPlugin {
  onKeyDown(event, editor, next) {
    if (isHotkey("space", event)) {
      this.onSpace(event, editor, next);
    } else if (isHotkey("backspace", event)) {
      this.onBackspace(event, editor, next);
    } else if (isHotkey("enter", event)) {
      this.onEnter(event, editor, next);
    } else if (isHotkey("shift+enter", event)) {
      this.onShiftEnter(event, editor, next);
    } else {
      next();
    }
  }

  onSpace(event, editor, next) {
    const { value } = editor;
    const { selection, startBlock } = value;

    if (selection.isExpanded) return next();

    const blockProp = getBlockProp(
      startBlock.text.slice(0, selection.start.offset).replace(/\s*/g, "")
    );
    if (blockProp) {
      event.preventDefault();
      return editor
        .withoutMerging(() => {
          editor.moveStartToStartOfBlock(startBlock).delete();
        })
        .setBlocks(blockProp);
    }

    next();
  }

  onBackspace(event, editor, next) {
    const { value } = editor;
    const { document, selection, startBlock } = value;
    const parentBlock = document.getParent(startBlock.key);

    if (selection.isExpanded || selection.start.offset !== 0) return next();

    if (parentBlock.type === "blockquote" && parentBlock.nodes.size <= 1) {
      console.log("[backspace] [blockquote] [clear format]");
      event.preventDefault();
      return editor
        .splitBlock(2)
        .unwrapBlock(parentBlock.type)
        .removeNodeByKey(parentBlock.key);
    }

    if (parentBlock.type === "listItem") {
      const listBlock = document.getParent(parentBlock.key);
      if (listBlock.nodes.size <= 1) {
        console.log("[backspace] [list] [clear format]");
        event.preventDefault();
        return editor
          .splitBlock(3)
          .unwrapBlock(parentBlock.type)
          .removeNodeByKey(listBlock.key);
      }

      if (startBlock.text.length === 0) {
        console.log("[backspace] [listItem] [clear format]");
        event.preventDefault();
        return editor.removeNodeByKey(parentBlock.key);
      }
    }

    if (startBlock.type !== "paragraph") {
      console.log("[backspace] [other] [clear format]");
      event.preventDefault();
      return editor.setBlocks("paragraph");
    }

    next();
  }

  onEnter(event, editor, next) {
    const { value } = editor;
    const { document, selection, startBlock } = value;
    const parentBlock = document.getParent(startBlock.key);

    if (selection.isExpanded && selection.start.offset !== 0) return next();

    if (parentBlock.type === "blockquote") {
      if (startBlock.text.length === 0) {
        console.log("[enter] [blockquote] [null line]");
        event.preventDefault();
        return editor
          .splitBlock(2)
          .unwrapBlock(parentBlock.type)
          .removeNodeByKey(startBlock.key);
      }
    }

    if (parentBlock.type === "listItem") {
      if (startBlock.text.length === 0) {
        console.log("[enter] [listItem] [null line]");
        event.preventDefault();
        editor.splitBlock(3);
        editor.unwrapBlock(parentBlock.type);
        return editor.removeNodeByKey(parentBlock.key);
      } else {
        console.log("[enter] [listItem] [default]");
        event.preventDefault();
        return editor.splitBlock(2);
      }
    }

    if (startBlock.text.length === selection.start.offset) {
      console.log("[enter] [other] [splitBlock paragraph]");
      event.preventDefault();
      return editor.splitBlock().setBlocks("paragraph");
    }

    next();
  }

  onShiftEnter(event, editor, next) {
    const { value } = editor;
    const { selection, startBlock } = value;

    if (selection.isExpanded) return event.preventDefault();

    if (startBlock.type === "paragraph") {
      console.log("[shift + enter] [paragraph] [insert break]");
      event.preventDefault();
      return editor.insertInline("break").moveForward();
    }

    event.preventDefault();
  }
}

export default () => {
  const instance = new MarkdownShortcutsPlugin();

  return {
    onKeyDown(event, editor, next) {
      return instance.onKeyDown(event, editor, next);
    }
  };
};
