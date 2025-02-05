// ==UserScript==
// @name        Steam Feature Flags
// @description A userscript for more and better feature flags on Steam store pages using info from PCGamingWiki.
// @version     0.1
// @author      Ryan McLaughlin
// @namespace   https://ryan-mclaughlin.ca
// @updateURL   https://raw.githubusercontent.com/RyanPMcL/Steam-Feature-Flags/refs/heads/main/SteamFlags.user.js
// @downloadURL https://raw.githubusercontent.com/RyanPMcL/Steam-Feature-Flags/refs/heads/main/SteamFlags.user.js
// @match       https://store.steampowered.com/app/*
// @connect     *
// @grant       GM.getValue
// @grant       GM.setValue
// @grant       GM.xmlHttpRequest
// ==/UserScript==

(function () {
  "use strict";
  function fetchMultiplayerInfo(appID) {
    const pcgwApiUrl = `https://www.pcgamingwiki.com/api/appid.php?appid=${appID}`;
    GM.xmlhttpRequest({
      method: "GET",
      url: pcgwApiUrl,
      onload: function (response) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(
            response.responseText,
            "text/html"
          );
          const localMultiplayerData = extractMultiplayerInfo(
            doc,
            "Local play",
            appID
          );
          const lanMultiplayerData = extractMultiplayerInfo(
            doc,
            "LAN play",
            appID
          );
          const onlineMultiplayerData = extractMultiplayerInfo(
            doc,
            "Online play",
            appID
          );
          updateMultiplayerInfo(
            localMultiplayerData,
            lanMultiplayerData,
            onlineMultiplayerData
          );
        } catch (error) {
          updateMultiplayerInfo(
            {
              type: "Local Multiplayer",
              players: "Unknown",
              link: `https://www.pcgamingwiki.com/api/appid.php?appid=${appID}#Network`,
            },
            {
              type: "LAN Multiplayer",
              players: "Unknown",
              link: `https://www.pcgamingwiki.com/api/appid.php?appid=${appID}#Network`,
            },
            {
              type: "Online Multiplayer",
              players: "Unknown",
              link: `https://www.pcgamingwiki.com/api/appid.php?appid=${appID}#Network`,
            }
          );
        }
      },
    });
  }
  function extractMultiplayerInfo(doc, playType, defaultRowIndex, appID) {
    let players = "Unknown";
    let supportStatus = "Unknown";
    let rowIndex = defaultRowIndex;
    const rows = doc.querySelectorAll(".table-network-multiplayer-body-row");
    rows.forEach((row, index) => {
      const header = row.querySelector("th");
      if (header && header.innerText.includes(playType)) {
        rowIndex = index + 2;
      }
    });
    const playersElement = doc.querySelector(
      `.table-network-multiplayer-body-row:nth-of-type(${rowIndex}) .table-network-multiplayer-body-players`
    );
    if (playersElement) {
      players = playersElement.innerText.trim();
    }
    const supportElement = doc.querySelector(
      `.table-network-multiplayer-body-row:nth-of-type(${rowIndex}) .table-network-multiplayer-body-rating div`
    );
    if (supportElement) {
      const supportTitle = supportElement.getAttribute("title");
      if (supportTitle === "Native support") {
        supportStatus = "Supported";
      } else if (supportTitle === "Hackable") {
        supportStatus = " (Mods)";
      } else if (supportTitle === "No native support") {
        supportStatus = "Unsupported";
      } else if (supportTitle === "Unknown") {
        supportStatus = "Unknown";
      }
    }
    if (players === "Unknown" && supportStatus === "Unknown") {
      const titleElement = doc.querySelector(".template-infobox-title");
      if (titleElement) {
        supportStatus = "Unsupported";
      } else {
        supportStatus = "Unknown";
      }
    }
    const type = playType.replace("play", "Multiplayer");
    const finalValue =
      players !== "Unknown"
        ? players + (supportStatus === " (Mods)" ? supportStatus : "")
        : supportStatus;
    return {
      type: type,
      players: finalValue,
      link: `https://www.pcgamingwiki.com/api/appid.php?appid=${appID}#Network`,
    };
  }
  function updateMultiplayerInfo(
    localMultiplayerData,
    lanMultiplayerData,
    onlineMultiplayerData
  ) {
    const featuresList = document.querySelector(".game_area_features_list_ctn");
    if (featuresList) {
      if (
        onlineMultiplayerData.players !== "Unknown" ||
        lanMultiplayerData.players !== "Unknown"
      ) {
        const tagsToRemove = [
          "Online PvP",
          "Shared/Split Screen PvP",
          "Online Co-op",
          "Shared/Split Screen Co-op",
          "LAN PvP",
          "LAN Co-op",
        ];
        tagsToRemove.forEach((tag) => {
          const tagElement = Array.from(featuresList.children).find((el) =>
            el.textContent.includes(tag)
          );
          if (tagElement) {
            tagElement.remove();
          }
        });
      }
      const createMultiplayerItem = (data, id, isEven) => {
        const multiplayerItem = document.createElement("a");
        multiplayerItem.className = `game_area_details_specs_ctn multiplayer-info ${
          isEven ? "even" : "odd"
        } ds_collapse_flag ds_collapse_flag_tiny es_highlight_checked`;
        multiplayerItem.href = data.link;
        multiplayerItem.target = "_blank";
        multiplayerItem.id = id;
        multiplayerItem.style.display = GM.getValue(id, true) ? "flex" : "none";
        multiplayerItem.style.alignItems = "center";
        multiplayerItem.innerHTML = `<div class="icon"><img class="category_icon" src="https://store.cloudflare.steamstatic.com/public/images/v6/ico/ico_multiPlayer.png"></div><div class="label">${
          data.type
        }: ${data.players !== "" ? data.players : "Supported"}</div>`;
        featuresList.appendChild(multiplayerItem);
      };
      createMultiplayerItem(localMultiplayerData, "localMultiplayer", false);
      createMultiplayerItem(lanMultiplayerData, "lanMultiplayer", true);
      createMultiplayerItem(onlineMultiplayerData, "onlineMultiplayer", false);
      createToggleMenu(featuresList);
    }
  }
  function createToggleMenu(featuresList) {
    const toggleWrapper = document.createElement("div");
    toggleWrapper.style.cssText = "margin-bottom: 10px;";
    const toggleButton = document.createElement("a");
    toggleButton.className = "game_area_details_specs_ctn";
    toggleButton.style.cssText =
      "cursor: pointer; display: flex; align-items: center;";
    toggleButton.innerHTML = `<div class="icon"><img class="category_icon" src="https://store.cloudflare.steamstatic.com/public/images/v6/ico/ico_workshop.png"></div><div class="label">Toggle Multiplayer Info</div>`;
    const toggleMenu = document.createElement("div");
    toggleMenu.style.cssText = "display: none;";
    const toggleLocalMultiplayer = createToggle(
      "Local Multiplayer",
      "localMultiplayer",
      false
    );
    const toggleLanMultiplayer = createToggle(
      "LAN Multiplayer",
      "lanMultiplayer",
      true
    );
    const toggleOnlineMultiplayer = createToggle(
      "Online Multiplayer",
      "onlineMultiplayer",
      false
    );
    toggleMenu.appendChild(toggleLocalMultiplayer);
    toggleMenu.appendChild(toggleLanMultiplayer);
    toggleMenu.appendChild(toggleOnlineMultiplayer);
    toggleButton.addEventListener("click", () => {
      toggleMenu.style.display =
        toggleMenu.style.display === "none" ? "block" : "none";
    });
    toggleWrapper.appendChild(toggleButton);
    toggleWrapper.appendChild(toggleMenu);
    featuresList.prepend(toggleWrapper);
  }
  function createToggle(labelText, id, isEven) {
    const toggleContainer = document.createElement("div");
    toggleContainer.className = `game_area_dlc_row ${
      isEven ? "even" : "odd"
    } ds_collapse_flag ds_collapse_flag_tiny es_highlight_checked`;
    toggleContainer.style.cssText = "padding: 4px 0;";
    const toggleLabel = document.createElement("label");
    toggleLabel.className = "es_dlc_label";
    const toggleCheckbox = document.createElement("input");
    toggleCheckbox.type = "checkbox";
    toggleCheckbox.checked = GM.getValue(id, true);
    toggleCheckbox.addEventListener("change", () => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = toggleCheckbox.checked ? "flex" : "none";
        GM.setValue(id, toggleCheckbox.checked);
      }
    });
    toggleLabel.appendChild(toggleCheckbox);
    toggleContainer.appendChild(toggleLabel);
    toggleContainer.appendChild(document.createTextNode(labelText));
    toggleContainer.addEventListener("click", () => {
      toggleCheckbox.checked = !toggleCheckbox.checked;
      const element = document.getElementById(id);
      if (element) {
        element.style.display = toggleCheckbox.checked ? "flex" : "none";
        GM.setValue(id, toggleCheckbox.checked);
      }
    });
    return toggleContainer;
  }
  const appID = window.location.pathname.split("/")[2];
  if (appID) {
    fetchMultiplayerInfo(appID);
  }
})();