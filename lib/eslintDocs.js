const cheerio = require("cheerio");
const axios = require("axios").default;
const turndown = new (require("turndown"))();

/**
 * 
 * @param {String} ruleName
 */
async function findRule(ruleName) {
    const { data: HTMLRules } = await axios.get("https://eslint.org/docs/rules/");
    const $ = cheerio.load(HTMLRules);

    // collecting rules.
    const rules = [];
    $("[class=\"rule-list table table-striped\"]").each((_, ruleTableElement) => {
        const rulesElement = $(ruleTableElement).find("tbody > tr");
        rulesElement.each((_, ruleElement) => {
            const rule = $(ruleElement);
            const name = rule.find("a").text().trim();
            const url = "https://eslint.org/docs/rules/" + rule.find("a").attr("href");
            const description = rule.find("td").last().text().trim();
            rules.push({ name, url, description });
        });
    });
    return rules.filter(rule => rule.name.includes(ruleName));
}

async function getRule(ruleURL) {
    const { data: HTMLRule } = await axios.get(ruleURL);
    const $ = cheerio.load(HTMLRule);

    const detail = turndown.turndown($("h2#rule-details").next().text().trim());
    const resourcesElement = $("h2#resources").next().find("li");
    const resources = [];
    resourcesElement.each((_, resourceElement) => {
        const resource = $(resourceElement);
        const name = resource.find("a").text().trim();
        const url = resource.find("a").attr("href");
        resources.push({ name, url });
    });
    const versionText = $("h2#version").next().text().trim();
    return { name: $("title").text().replace("- Rules - ESLint - Pluggable JavaScript linter", "").trim(), detail, resources, versionText };
}

module.exports = { findRule, getRule };