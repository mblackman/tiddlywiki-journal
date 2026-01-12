import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IChangedTiddlers, IParseTreeNode } from 'tiddlywiki';

class HabitDotsWidget extends Widget {
  private habitTitles: string[] = [];

  execute() {
    this.habitTitles = this.wiki.filterTiddlers('[tag[$:/tags/Journal/Habit]!has[draft.of]sort[caption]]');
    const currentTiddlerTitle = this.getVariable('currentTiddler');
    const currentTiddler = this.wiki.getTiddler(currentTiddlerTitle);

    const nodes: IParseTreeNode[] = [];

    for (const habitTitle of this.habitTitles) {
      const habitTiddler = this.wiki.getTiddler(habitTitle);
      if (!habitTiddler) continue;

      const field = habitTiddler.fields['journal-field'] as string;
      const shorthand = (habitTiddler.fields['habit-shorthand'] as string || '').trim();
      const type = (habitTiddler.fields['habit-type'] as string) || 'number';
      const caption = (habitTiddler.fields['caption'] as string) || habitTitle;

      if (!field || !shorthand) continue;

      const value = currentTiddler ? (currentTiddler.fields[field] as string) : undefined;

      let showDot = false;

      if (type === 'checkbox') {
        if (value === 'yes') showDot = true;
      } else if (type === 'number') {
        if (value && value !== '0') showDot = true;
      } else {
        if (value) showDot = true;
      }

      if (showDot) {
        nodes.push({
          type: 'element',
          tag: 'span',
          attributes: {
            class: { type: 'string', value: 'habit-dot' },
            title: { type: 'string', value: caption },
          },
          children: [
            { type: 'text', text: shorthand },
          ],
        });
      }
    }

    this.makeChildWidgets(nodes);
  }

  render(parentNode: Element, nextSibling: Element | null) {
    this.parentDomNode = parentNode;
    this.execute();
    this.renderChildren(parentNode, nextSibling);
  }

  refresh(changedTiddlers: IChangedTiddlers): boolean {
    const currentTiddler = this.getVariable('currentTiddler');
    if (currentTiddler && changedTiddlers[currentTiddler]) {
      this.refreshSelf();
      return true;
    }

    for (const title of this.habitTitles) {
      if (changedTiddlers[title]) {
        this.refreshSelf();
        return true;
      }
    }

    const newHabitTitles = this.wiki.filterTiddlers('[tag[$:/tags/Journal/Habit]!has[draft.of]sort[caption]]');
    if (newHabitTitles.length !== this.habitTitles.length) {
      this.refreshSelf();
      return true;
    }
    for (let index = 0; index < newHabitTitles.length; index++) {
      if (newHabitTitles[index] !== this.habitTitles[index]) {
        this.refreshSelf();
        return true;
      }
    }

    return this.refreshChildren(changedTiddlers);
  }
}

exports['habit-dots'] = HabitDotsWidget;
