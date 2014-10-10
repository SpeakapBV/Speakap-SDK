Speakap-SDK
===========

Libraries to aid 3rd-party Speakap Application developers.

Currently, we have libraries to aid developers for 3 different server-side languages and platforms,
as well as a library for aiding frontend developers to integrate their Application with Speakap.

JavaScript
----------

We have a frontend library to communicate with the Speakap Frontend so you can tightly integrate
your Application with Speakap. Just copy `speakap.js` from the `js` directory into your project.
You can require the file using Require.js or Browserify or load it directly with a script tag. Note
the file is dependent on jQuery (you can use the `jquery.min.js` from the `js` directory if you
don't have jQuery in your project yet).

For more information on how to use the frontend library, see:
                                  http://developers.speakap.io/portal/tutorials/frontend_proxy.html

We also have a server-side JavaScript library for usage with Node.js. Just copy `speakap.js` from
the `node` directory into your project and require it to get going. There is inline documentation in
the file itself.

There are usage examples for the Node.js library in the `examples/node` directory.

PHP
---

For PHP we have a server-side library. See the README.md in the `php` directory for more
information.


Python
------

For Python we have a server-side library. Just copy the sources from the `python` directory into
your project and `import "speakap"` to get going. There is inline documentation in the `speakap.py`
file.
