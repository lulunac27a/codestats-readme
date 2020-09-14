import { getCardColors, FlexLayout, clampValue } from "../common/utils"
import Card from '../common/Card'
import { query } from "../../api/top-langs";
import { data } from "../fetchers/top-languages-fetcher";
import React from 'react'
import themes from "../../themes";

export interface parsedQuery {
	hide?: Array<string>
	hide_title?: boolean
	hide_border?: boolean
	card_width?: number
	title_color?: string
	text_color?: string
	bg_color?: string
	language_count?: number
	show_level?: string
	theme?: keyof typeof themes
	cache_seconds?: string
	layout?: string
}

const createProgressNode = ({ width, color, name, progress, progress2 }: {width: number ,color: string, name: string, progress: number, progress2:number}) => {
	const paddingRight = 60;
	const progressWidth = width - paddingRight;
	const progressPercentage = clampValue(progress, 2, 100);
	const progress2Percentage = clampValue(progress2, 2, 100);

	return (
		<>
			<text data-testid="lang-name" x="2" y="15" className="lang-name">{name} {progress}%{progress2 > progress ? ` + ${progress2 - progress}%` : ''}</text>
			<svg width={progressWidth}>
				<rect rx="5" ry="5" x="0" y="25" width={progressWidth} height="8" fill="#ddd" />
				<rect
					height="8"
					fill="#f2b866"
					rx="5" ry="5" x="1" y="25"
					width={`calc(${progress2Percentage}% - 1px)`}
				/>
				<rect
					height="8"
					fill={color}
					rx="5" ry="5" x="0" y="25"
					data-testid="lang-progress"
					width={`${progressPercentage}%`}
				/>
			</svg>
		</>
	)
};

const createCompactLangNode = ({ lang, totalSize, x, y }: {lang: data, totalSize: number, x: number, y: number}) => {
	const percentage = ((lang.size / totalSize) * 100).toFixed(2);
	const color = lang.color || "#858585";

	return (
		<g transform={`translate(${x}, ${y})`}>
		<circle cx="5" cy="6" r="5" fill={color} />
		<text data-testid="lang-name" x="15" y="10" className='lang-name'>
			{lang.name} {percentage}%
		</text>
		</g>
	)
};

const createLanguageTextNode = ({ langs, totalSize, x, y }: { langs: Array<data>, totalSize: number, x: number, y: number}) => {
	return langs.map((lang, index) => {
		if (index % 2 === 0) {
		return createCompactLangNode({
			lang,
			x,
			y: 12.5 * index + y,
			totalSize
		});
		}
		return createCompactLangNode({
		lang,
		x: 150,
		y: 12.5 + 12.5 * index,
		totalSize
		});
	});
};

const lowercaseTrim = (name: string) => name.toLowerCase().trim();

const renderTopLanguages = (topLangs: Record<string, data>, options: parsedQuery = {}) => {
	const {
		hide_title,
		hide_border,
		card_width,
		title_color,
		text_color,
		bg_color,
		hide,
		language_count,
		theme,
		layout,
	} = options;

	let langs = Object.values(topLangs);
	let langsToHide: Record<string, boolean> = {};

	// populate langsToHide map for quick lookup
	// while filtering out
	if (hide) {
		hide.forEach((langName) => {
			langsToHide[lowercaseTrim(langName)] = true;
		});
	}

	// filter out langauges to be hidden
	langs = langs
		.sort((a, b) => b.size - a.size)
		.filter((lang) => {
		return !langsToHide[lowercaseTrim(lang.name)];
		})
		.slice(0, language_count || 5);

	const totalLanguageSize = langs.reduce((acc, curr) => {
		return acc + curr.size;
	}, 0);

	// returns theme based colors with proper overrides and defaults
	const { titleColor, textColor, bgColor } = getCardColors({
		title_color,
		text_color,
		bg_color,
		theme,
	});

	let width = typeof card_width !== 'number' ? 300 : isNaN(card_width) ? 300 : card_width;
	let height = 45 + (langs.length + 1) * 40;

	let finalLayout: JSX.Element | Array<JSX.Element>;

	// RENDER COMPACT LAYOUT
	if (layout === "compact") {
		width = width + 50;
		height = 30 + (langs.length / 2 + 1) * 40;

		// progressOffset holds the previous language's width and used to offset the next language
		// so that we can stack them one after another, like this: [--][----][---]
		let progressOffset = 0;
		const compactProgressBar = langs
		.map((lang, index) => {
			const percentage = parseFloat((
			(lang.size / totalLanguageSize) *
			(width - 50)
			).toFixed(2));

			const progress =
			percentage < 10 ? percentage + 10 : percentage;

			const output = (
				<rect
					key={index}
					mask="url(#rect-mask)"
					data-testid="lang-progress"
					x={progressOffset}
					y="0"
					width={progress}
					height="8"
					fill={lang.color || "#858585"}
				/>
			)
			progressOffset += percentage;
			return output;
		})

		finalLayout = (
			<>
				<mask id="rect-mask">
					<rect x="0" y="0" width={
					width - 50
					} height="8" fill="white" rx="5" />
				</mask>
				{compactProgressBar}
				{createLanguageTextNode({
					x: 0,
					y: 25,
					langs,
					totalSize: totalLanguageSize,
				})}
			</>
		)

		finalLayout = (
			<>
				<mask id="rect-mask">
					<rect x="0" y="0" width={width - 50} height="8" fill="white" rx="5" />
				</mask>
				{compactProgressBar}
				{createLanguageTextNode({
					x: 0,
					y: 25,
					langs,
					totalSize: totalLanguageSize,
				})}
			</>
		)
	} else {
		finalLayout = FlexLayout({
			items: langs.map((lang) => {
				return createProgressNode({
					width: width,
					name: lang.name,
					color: lang.color || "#858585",
					progress: parseFloat(((lang.size / totalLanguageSize) * 100).toFixed(2)),
					progress2: parseFloat(((lang.recentSize / totalLanguageSize) * 100).toFixed(2)),
				});
			}),
			gap: 40,
			direction: "column",
		})
	}

	const card = new Card(
		width,
		height,
		{
			titleColor,
			textColor,
			bgColor,
		},
		"Most Used Languages",
	)

	card.disableAnimations();
	card.setHideBorder(hide_border || false);
	card.setHideTitle(hide_title || false);
	card.setCSS(`
		.lang-name { font: 400 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${textColor} }
	`);

	return card.render(
		<svg data-testid="lang-items" x="25">
			{finalLayout}
		</svg>
	)
};

export default renderTopLanguages
