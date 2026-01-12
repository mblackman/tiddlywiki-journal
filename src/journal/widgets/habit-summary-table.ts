import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { IChangedTiddlers, IParseTreeNode } from 'tiddlywiki';

class HabitSummaryTableWidget extends Widget {
  private habitTitles: string[] = [];
  private rowTitles: string[] = [];

  private getColour(name: string): string {
    return this.wiki.renderText(
      'text/plain',
      'text/vnd.tiddlywiki',
      `<<colour ${name}>>`,
    );
  }

  execute() {
    const mode = this.getAttribute('mode', 'weekly');
    const storyTiddler = this.getVariable('storyTiddler');
    const currentTiddler = this.getVariable('currentTiddler');
    const matchTitle =
      storyTiddler && storyTiddler !== '' ? storyTiddler : currentTiddler;

    this.setVariable('matchTitle', matchTitle);

    this.habitTitles = this.wiki.filterTiddlers(
      '[tag[$:/tags/Journal/Habit]!has[draft.of]sort[caption]]',
    );

    if (mode === 'yearly') {
      this.rowTitles = this.wiki.filterTiddlers(
        '[tag[Monthly]tag[Journal]tag<matchTitle>sort[journal-date]]',
        this,
      );
    } else {
      this.rowTitles = this.wiki.filterTiddlers(
        '[tag[Daily]tag[Journal]tag<matchTitle>sort[title]]',
        this,
      );
    }

    const tableBorderColor = this.getColour('table-border');
    const tableHeaderBg = this.getColour('table-header-background');

    // --- Build Header Row ---
    const firstColText = mode === 'yearly' ? 'Month' : 'Day';
    const headerCells: IParseTreeNode[] = [
      {
        type: 'element',
        tag: 'th',
        attributes: {
          style: { type: 'string', value: 'text-align:left; padding: 8px;' },
        },
        children: [{ type: 'text', text: firstColText }],
      },
    ];

    for (const habitTitle of this.habitTitles) {
      const tiddler = this.wiki.getTiddler(habitTitle);
      const caption = (tiddler?.fields.caption as string) || habitTitle;
      headerCells.push({
        type: 'element',
        tag: 'th',
        attributes: {
          style: { type: 'string', value: 'text-align:center; padding: 8px;' },
        },
        children: [{ type: 'text', text: caption }],
      });
    }

    // --- Build Data Rows ---
    const rows: IParseTreeNode[] = [];

    for (const rowTitle of this.rowTitles) {
      const rowTiddler = this.wiki.getTiddler(rowTitle);
      if (!rowTiddler) continue;

      const rowCells: IParseTreeNode[] = [];

      // Label Cell
      let labelText = '';
      if (mode === 'yearly') {
        labelText = rowTitle.split('-').pop() || rowTitle;
      } else {
        // Assuming title format YYYY-MM-DD
        const dateString = rowTitle.replace(/-/g, '') + '120000000';
        const date = $tw.utils.parseDate(dateString);
        labelText = date ? $tw.utils.formatDateString(date, 'ddd') : '';
      }

      rowCells.push({
        type: 'element',
        tag: 'td',
        attributes: { style: { type: 'string', value: 'padding: 6px;' } },
        children: [
          {
            type: 'link',
            attributes: { to: { type: 'string', value: rowTitle } },
            children: [{ type: 'text', text: labelText }],
          },
        ],
      });

      // Habit Cells
      for (const habitTitle of this.habitTitles) {
        const habitTiddler = this.wiki.getTiddler(habitTitle);
        const field = habitTiddler?.fields['journal-field'] as string;
        const type = (habitTiddler?.fields['habit-type'] as string) || 'number';

        const content: IParseTreeNode[] = [];

        if (mode === 'yearly') {
          // Aggregate for the month
          const daysInMonth = this.wiki.filterTiddlers(
            `[tag[Daily]tag[Journal]tag[${rowTitle}]]`,
          );
          let sum = 0;
          let count = 0;

          for (const day of daysInMonth) {
            const val = this.wiki.getTiddler(day)?.fields[field] as string;
            if (type === 'number') {
              const n = parseFloat(val);
              if (!isNaN(n)) sum += n;
            } else if (type === 'checkbox') {
              if (val === 'yes') count++;
            }
          }

          let text = '';
          if (type === 'number') text = sum.toString();
          if (type === 'checkbox') text = count.toString();
          content.push({ type: 'text', text: text });
        } else {
          // Weekly (Daily) mode - direct value
          const value = rowTiddler.fields[field] as string;
          if (type === 'checkbox') {
            if (value === 'yes') content.push({ type: 'text', text: '✅' });
            else if (value === 'no') content.push({ type: 'text', text: '❌' });
          } else {
            content.push({ type: 'text', text: value });
          }
        }

        rowCells.push({
          type: 'element',
          tag: 'td',
          attributes: {
            style: {
              type: 'string',
              value: 'text-align:center; padding: 6px;',
            },
          },
          children: content,
        });
      }

      rows.push({
        type: 'element',
        tag: 'tr',
        attributes: {
          style: {
            type: 'string',
            value: `border-bottom: 1px solid ${tableBorderColor};`,
          },
        },
        children: rowCells,
      });
    }

    // --- Build Totals Row ---
    const totalCells: IParseTreeNode[] = [
      {
        type: 'element',
        tag: 'td',
        attributes: { style: { type: 'string', value: 'padding: 8px;' } },
        children: [{ type: 'text', text: 'TOTALS' }],
      },
    ];

    for (const habitTitle of this.habitTitles) {
      const habitTiddler = this.wiki.getTiddler(habitTitle);
      const field = habitTiddler?.fields['journal-field'] as string;
      const type = (habitTiddler?.fields['habit-type'] as string) || 'number';

      let sum = 0;
      let count = 0;

      // Calculate totals for the entire period (Week or Year)
      const allDaysInPeriod = this.wiki.filterTiddlers(
        `[tag[Daily]tag[Journal]tag<matchTitle>]`,
        this,
      );

      for (const dayTitle of allDaysInPeriod) {
        const value = this.wiki.getTiddler(dayTitle)?.fields[field] as string;
        if (type === 'number') {
          const n = parseFloat(value);
          if (!isNaN(n)) sum += n;
        } else if (type === 'checkbox') {
          if (value === 'yes') count++;
        }
      }

      let text = '';
      if (type === 'number') text = sum.toString();
      if (type === 'checkbox') text = count.toString();

      totalCells.push({
        type: 'element',
        tag: 'td',
        attributes: {
          style: { type: 'string', value: 'text-align:center; padding: 8px;' },
        },
        children: [{ type: 'text', text: text }],
      });
    }

    rows.push({
      type: 'element',
      tag: 'tr',
      attributes: {
        style: {
          type: 'string',
          value: `font-weight: bold; background-color: ${tableHeaderBg};`,
        },
      },
      children: totalCells,
    });

    // --- Construct Table Tree ---
    const tableNode: IParseTreeNode = {
      type: 'element',
      tag: 'table',
      attributes: {
        style: {
          type: 'string',
          value: 'width:100%; border-collapse: collapse;',
        },
      },
      children: [
        {
          type: 'element',
          tag: 'thead',
          children: [
            {
              type: 'element',
              tag: 'tr',
              attributes: {
                style: {
                  type: 'string',
                  value: `border-bottom: 2px solid ${tableBorderColor};`,
                },
              },
              children: headerCells,
            },
          ],
        },
        {
          type: 'element',
          tag: 'tbody',
          children: rows,
        },
      ],
    };

    this.makeChildWidgets([tableNode]);
  }

  render(parentNode: Element, nextSibling: Element | null) {
    this.parentDomNode = parentNode;
    this.computeAttributes();
    this.execute();
    this.renderChildren(parentNode, nextSibling);
  }

  refresh(changedTiddlers: IChangedTiddlers): boolean {
    // If any habit config or any day tiddler changes, refresh.
    // A more granular check could be done, but this ensures accuracy.

    // Check habits
    for (const h of this.habitTitles) {
      if (changedTiddlers[h]) {
        this.refreshSelf();
        return true;
      }
    }

    // Check rows (Days or Months)
    for (const r of this.rowTitles) {
      if (changedTiddlers[r]) {
        this.refreshSelf();
        return true;
      }
    }

    // Check underlying data (Daily tiddlers) for aggregates
    // This covers both Weekly (where rows are days) and Yearly (where rows are months but data is days)
    const matchTitle = this.getVariable('matchTitle');
    if (matchTitle) {
      const allDaysInPeriod = this.wiki.filterTiddlers(
        `[tag[Daily]tag[Journal]tag<matchTitle>]`,
        this,
      );
      for (const d of allDaysInPeriod) {
        if (changedTiddlers[d]) {
          this.refreshSelf();
          return true;
        }
      }
    }

    // Note: matchTitle variable is already set in execute, but we need to re-evaluate context if it changed
    // However, refresh is called on the existing widget instance.
    // We can just re-run the filter logic.
    const mode = this.getAttribute('mode', 'weekly');

    const newHabits = this.wiki.filterTiddlers(
      '[tag[$:/tags/Journal/Habit]!has[draft.of]sort[caption]]',
    );
    let newRows: string[] = [];
    if (mode === 'yearly') {
      newRows = this.wiki.filterTiddlers(
        '[tag[Monthly]tag[Journal]tag<matchTitle>sort[journal-date]]',
        this,
      );
    } else {
      newRows = this.wiki.filterTiddlers(
        '[tag[Daily]tag[Journal]tag<matchTitle>sort[title]]',
        this,
      );
    }

    if (
      newHabits.length !== this.habitTitles.length ||
      newRows.length !== this.rowTitles.length
    ) {
      this.refreshSelf();
      return true;
    }

    // Also check if the context tiddler itself changed (e.g. navigating to a different week)
    if (changedTiddlers[matchTitle]) {
      this.refreshSelf();
      return true;
    }

    return this.refreshChildren(changedTiddlers);
  }
}

exports['habit-summary-table'] = HabitSummaryTableWidget;
