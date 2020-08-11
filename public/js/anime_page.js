"use strict";

$(document).ready(function () {
	setupTags($(".anime-tag-input"), "/allAnimeTags");
	$(".tag-click").on("click", e => {
		window.location.href = "/anime_list#" + e.target.dataset.tag;
	});
});

