export interface Strings {
  menuCard: string;
  menuLink: string;
  menuPlain: string;
  toCard: string;
  toLink: string;
  toPlain: string;
  fetching: string;
  noTitle: string;
  cardWithoutMeta: string;
  urlMoved: string;
  noLinkAtCursor: string;
  commandChangeStyle: string;
  invalidCard: string;
  settingAskOnPasteName: string;
  settingAskOnPasteDesc: string;
  menuRefreshCard: string;
  menuRefetchCard: string;
  commandRefreshCard: string;
  commandRefetchCard: string;
  noCardAtCursor: string;
  refreshNothingEmpty: string;
  refreshFailed: string;
  refreshNoChange: string;
  cardMoved: string;
  cardInTable: string;
  confirmRefetchTitle: string;
  confirmRefetchBody: string;
  confirmRefetchButton: string;
  cancel: string;
  commandMigrate: string;
  migrateNone: string;
  /** `{count}` is replaced with the number of blocks. */
  migrateDone: string;
  /** `{count}` is replaced with the number of blocks. */
  migrateSkipped: string;
  settingExcludeName: string;
  settingExcludeDesc: string;
  settingCardDomainsName: string;
  settingCardDomainsDesc: string;
  settingLinkDomainsName: string;
  settingLinkDomainsDesc: string;
  settingTitleLimitName: string;
  settingTitleLimitDesc: string;
  settingTitleLimitInvalid: string;
}

const en: Strings = {
  menuCard: "Card",
  menuLink: "Link",
  menuPlain: "Plain URL",
  toCard: "Convert to card",
  toLink: "Convert to link",
  toPlain: "Convert to plain URL",
  fetching: "Fetching the page…",
  noTitle: "Couldn't get the page title, so the URL was left as it is.",
  cardWithoutMeta: "Couldn't fetch the page, so the card shows the URL only.",
  urlMoved: "The URL was edited while the page was loading, so nothing was changed.",
  noLinkAtCursor: "There is no link at the cursor.",
  commandChangeStyle: "Change link style at cursor",
  invalidCard: 'This link card has no valid "url".',
  settingAskOnPasteName: "Ask when pasting a URL",
  settingAskOnPasteDesc:
    "Show a menu to choose card, link or plain URL when you paste or drop a URL. When off, pasting works as usual, the domain lists below are not applied, and you can still convert with the command or the right-click menu.",
  menuRefreshCard: "Refresh card",
  menuRefetchCard: "Refetch all card fields…",
  commandRefreshCard: "Refresh card at cursor",
  commandRefetchCard: "Refetch all fields of the card at cursor",
  noCardAtCursor: "There is no card at the cursor.",
  refreshNothingEmpty: "This card has no empty fields. To overwrite it, use “Refetch all card fields”.",
  refreshFailed: "Couldn't fetch the page, so the card was not changed.",
  refreshNoChange: "The page had nothing new for this card.",
  cardMoved: "The card was edited while the page was loading, so nothing was changed.",
  cardInTable: "A card can't go inside a table, so the URL was left as it is.",
  confirmRefetchTitle: "Refetch all card fields?",
  confirmRefetchBody:
    "What the page provides now will replace the card's fields, including text you edited by hand. Fields the page no longer has are kept.",
  confirmRefetchButton: "Refetch",
  cancel: "Cancel",
  commandMigrate: "Convert Auto Card Link blocks in this note",
  migrateNone: "There are no Auto Card Link blocks in this note.",
  migrateDone: "Converted {count} Auto Card Link block(s) to link cards.",
  migrateSkipped: "{count} block(s) could not be read and were left as they are.",
  settingExcludeName: "Domains to leave alone",
  settingExcludeDesc: "One per line. URLs from these sites and their subdomains are pasted as usual, without the menu.",
  settingCardDomainsName: "Always make a card",
  settingCardDomainsDesc: "One per line. URLs from these sites become a card without the menu. Inside a table, the menu is shown instead.",
  settingLinkDomainsName: "Always make a link",
  settingLinkDomainsDesc: "One per line. URLs from these sites become a titled link without the menu.",
  settingTitleLimitName: "Maximum title length",
  settingTitleLimitDesc: "Page titles longer than this are cut short with “…” in links and new cards. 0 means no limit.",
  settingTitleLimitInvalid: "Enter 0 or a positive whole number.",
};

const ja: Strings = {
  menuCard: "カード",
  menuLink: "リンク",
  menuPlain: "URLのまま",
  toCard: "カードにする",
  toLink: "リンクにする",
  toPlain: "URLに戻す",
  fetching: "ページ情報を取得しています…",
  noTitle: "ページのタイトルを取得できなかったので、URLのままにしました。",
  cardWithoutMeta: "ページ情報を取得できなかったので、URLだけのカードにしました。",
  urlMoved: "取得中にURLが編集されたので、変換を取りやめました。",
  noLinkAtCursor: "カーソル位置にリンクがありません。",
  commandChangeStyle: "カーソル位置のリンクの表示形式を変える",
  invalidCard: "このリンクカードには有効な url がありません。",
  settingAskOnPasteName: "URLを貼り付けたときに形式を選ぶ",
  settingAskOnPasteDesc:
    "URLを貼り付けたりドロップしたりしたときに、カード・リンク・URLのままから選ぶメニューを出します。オフにすると通常の貼り付けになり、下のドメインの設定も使いません。コマンドか右クリックメニューで後から変換できます。",
  menuRefreshCard: "カードを更新",
  menuRefetchCard: "カードを取り直す…",
  commandRefreshCard: "カーソル位置のカードを更新",
  commandRefetchCard: "カーソル位置のカードを取り直す",
  noCardAtCursor: "カーソル位置にカードがありません。",
  refreshNothingEmpty: "このカードに空欄はありません。上書きするときは「カードを取り直す」を使ってください。",
  refreshFailed: "ページ情報を取得できなかったので、カードは変えていません。",
  refreshNoChange: "ページに新しい情報はありませんでした。",
  cardMoved: "取得中にカードが編集されたので、更新を取りやめました。",
  cardInTable: "表の中にはカードを置けないので、URLのままにしました。",
  confirmRefetchTitle: "カードを取り直しますか？",
  confirmRefetchBody: "いまのページの情報でカードの項目を上書きします。手で書き換えた内容も上書きされます。ページにない項目はそのまま残します。",
  confirmRefetchButton: "取り直す",
  cancel: "キャンセル",
  commandMigrate: "このノートの Auto Card Link のブロックを変換",
  migrateNone: "このノートに Auto Card Link のブロックはありません。",
  migrateDone: "Auto Card Link のブロックを {count} 件リンクカードに変換しました。",
  migrateSkipped: "{count} 件は読み取れなかったので、そのまま残しました。",
  settingExcludeName: "メニューを出さないドメイン",
  settingExcludeDesc: "1行に1つ。これらのサイトとそのサブドメインのURLは、メニューを出さずに通常どおり貼り付けます。",
  settingCardDomainsName: "いつもカードにするドメイン",
  settingCardDomainsDesc: "1行に1つ。これらのサイトのURLは、メニューを出さずにカードにします。表の中ではメニューを出します。",
  settingLinkDomainsName: "いつもリンクにするドメイン",
  settingLinkDomainsDesc: "1行に1つ。これらのサイトのURLは、メニューを出さずにタイトル付きのリンクにします。",
  settingTitleLimitName: "タイトルの最大文字数",
  settingTitleLimitDesc: "これより長いページタイトルは、リンクと新しいカードで「…」を付けて短くします。0 は上限なし。",
  settingTitleLimitInvalid: "0 以上の整数を入れてください。",
};

export function getStrings(locale: string): Strings {
  return locale.toLowerCase().startsWith("ja") ? ja : en;
}
