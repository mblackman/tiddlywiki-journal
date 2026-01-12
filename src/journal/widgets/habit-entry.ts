import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IChangedTiddlers, IParseTreeAttribute, IParseTreeNode } from 'tiddlywiki';

class JournalHabitsWidget extends Widget {
  private habitTitles: string[] = [];

  execute() {
    // Get habit configurations
    this.habitTitles = this.wiki.filterTiddlers('[tag[$:/tags/Journal/Habit]!has[draft.of]sort[caption]]');

    const nodes: IParseTreeNode[] = [];

    for (const title of this.habitTitles) {
      const tiddler = this.wiki.getTiddler(title);
      if (!tiddler) continue;

      const caption = tiddler.fields['caption'] as string || title;
      const field = tiddler.fields['journal-field'] as string;
      const type = (tiddler.fields['habit-type'] as string) || 'number';

      if (!field) continue;

      // Create the label node
      const labelNode: IParseTreeNode = {
        type: 'element',
        tag: 'span',
        attributes: {
          class: { type: 'string', value: 'habit-label' },
        },
        children: [
          { type: 'text', text: caption },
        ],
      };

      let inputWidgetNode: IParseTreeNode;

      if (type === 'checkbox') {
        inputWidgetNode = {
          type: 'checkbox',
          attributes: {
            field: { type: 'string', value: field },
            checked: { type: 'string', value: 'yes' },
            unchecked: { type: 'string', value: 'no' },
            default: { type: 'string', value: 'no' },
          },
        };
      } else {
        const attributes: Record<string, IParseTreeAttribute> = {
          field: { type: 'string', value: field },
          class: { type: 'string', value: 'tc-edit-texteditor habit-input' },
          placeholder: { type: 'string', value: type === 'number' ? '0' : '' },
        };

        if (type === 'number') {
          attributes.type = { type: 'string', value: 'number' };
          attributes.size = { type: 'string', value: '5' };
        }

        inputWidgetNode = {
          type: 'edit-text',
          attributes: attributes,
        };
      }

      // Wrap in div to match previous macro structure
      const containerNode: IParseTreeNode = {
        type: 'element',
        tag: 'div',
        children: [labelNode, inputWidgetNode],
      };

      nodes.push(containerNode);
    }

    // Construct the child widgets from these nodes
    this.makeChildWidgets(nodes);
  }

  render(parentNode: Element, nextSibling: Element | null) {
    this.parentDomNode = parentNode;
    this.execute();
    this.renderChildren(parentNode, nextSibling);
    // Collect child dom nodes so this widget can be properly refreshed/removed
    this.children.forEach(child => {
      this.domNodes.push(...child.domNodes);
    });
  }

  refresh(changedTiddlers: IChangedTiddlers): boolean {
    let dirty = false;

    // Check if any of the currently rendered habit config tiddlers changed
    for (const title of this.habitTitles) {
      if (changedTiddlers[title]) {
        dirty = true;
        break;
      }
    }

    // Check if the list of habits itself has changed (additions/removals/reordering)
    if (!dirty) {
      const newHabits = this.wiki.filterTiddlers('[tag[$:/tags/Journal/Habit]!has[draft.of]sort[caption]]');
      if (newHabits.length !== this.habitTitles.length) {
        dirty = true;
      } else {
        for (let index = 0; index < newHabits.length; index++) {
          if (newHabits[index] !== this.habitTitles[index]) {
            dirty = true;
            break;
          }
        }
      }
    }

    if (dirty) {
      this.refreshSelf();
      return true;
    }

    return this.refreshChildren(changedTiddlers);
  }
}

exports['journal-habits'] = JournalHabitsWidget;
