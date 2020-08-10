"use strict";

function setupTags(dom, addr) {
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if(xhttp.readyState == 4 && xhttp.status == 200) {
			var source = new Bloodhound({
				datumTokenizer: Bloodhound.tokenizers.whitespace,
				queryTokenizer: Bloodhound.tokenizers.whitespace,
				local: JSON.parse(xhttp.responseText)
			});
			dom.typeahead({
				hint: true,
				highlight: true,
				minLength: 0
			}, {
				name: 'tags',
				source: source 
			});
		}
	};
	xhttp.open("GET", addr, true);
	xhttp.send();
}
