//****************************************************************************************************************************
//@version - v1.0.0
//@auth Joshua Richard
//@file embedded_html.js
//@descr compartmentalized ejs objects to be served to views. Improves readability and makes it easier to make changes across the site.
//@Copyright (C) joshua Richard, 2019-2020. All rights reserved.
//****************************************************************************************************************************


/**
*HEADER- bootstrap inspired navbar used across site
**/

var header = `
<nav id = 'navbarColo' class='navbar navbar-expand-lg navbar-light  navbar-fixed border-bottom p-3 px-md-4 mb-3 bg-white shadow-sm'>
  <a class='navbar-brand' href='#' style='font-family: garamond; border-bottom: medium solid black '><strong>O</strong>odle</a>
  <button class='navbar-toggler' type='button data-toggle='collapse' data-target='#navbarText' aria-controls='navbarText' aria-expanded='false' aria-label='Toggle navigation'>
    <span class='navbar-toggler-icon'></span>
  </button>
  <div class='collapse navbar-collapse' id='navbarText'>
    <ul class='navbar-nav mr-auto'>
      <li class='nav-item active'>
        <a class='nav-link' href='/'>Home <span class='sr-only'>(current)</span></a>
      </li>
      <li class='nav-item'>
        <a class='nav-link' href='/buy'>Buy</a>
      </li>
      <li class='nav-item'>
        <a class='nav-link' href='/send'>Send</a>
      </li>
      <li class='nav-item'>
        <a class='nav-link' href='/wallet'>Wallet</a>
      </li>
      <li class='nav-item'>
        <a class='nav-link' href='/blocks'>Blocks</a>
      </li>
      <li class='nav-item'>
        <a class='nav-link' href='/transactions'>Transaction</a>
      </li>
    </ul>
    <span class='navbar-text'>
      <a href='#' class='fa fa-facebook'></a>
      <a href='#' class='fa fa-twitter'></a>
      <a href='#' class='fa fa-instagram'></a>
    </span>
  </div>
</nav>
`;
module.exports = header;
