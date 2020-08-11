"use strict";

$(document).ready(function () {
	setupTags($(".anime-tag-input"), "/allWaifuTags");
	$(".tag-click").on("click", e => {
		window.location.href = "/waifu_list#" + e.target.dataset.tag;
	});
});

